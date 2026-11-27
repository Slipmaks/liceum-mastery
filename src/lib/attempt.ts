// Attempt lifecycle on the server: PRODUCT.md › Assignments, Attempt lifecycle, Anti-cheat.
import { and, eq, exists, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { answers, assignmentStudents, assignments, attemptEvents, attempts, retakeGrants, tests, type AttemptEventType } from "@/db/schema";
import type { Student } from "@/lib/auth";

const LOCKING = new Set<AttemptEventType>(["hidden", "pagehide", "reopen", "fullscreen_exit", "second_device"]);
/** Events the browser may report. `reopen` and `second_device` are detected by the server. */
export const CLIENT_EVENTS = new Set<string>(["hidden", "pagehide", "fullscreen_exit", "blur", "copy", "cut", "paste", "contextmenu"]);

export const EVENT_LABEL: Record<AttemptEventType, string> = {
  hidden: "Згорнув вкладку",
  pagehide: "Закрив сторінку",
  reopen: "Повторне відкриття",
  fullscreen_exit: "Вийшов з повноекранного режиму",
  second_device: "Вхід з іншого пристрою",
  blur: "Втрата фокусу",
  copy: "Спроба копіювання",
  cut: "Спроба вирізання",
  paste: "Спроба вставки",
  contextmenu: "Контекстне меню",
  unlock: "Розблоковано вчителем",
};

export type FinishReason = "submitted" | "timeout" | "closed";
export type AttemptState = { status: "in_progress" | "locked" | "finished"; remainingMs: number; finishReason?: FinishReason };

/**
 * Assignments of the student's school that this student may see: open ones for the whole class or listing them by name,
 * and closed ones where they hold an unused retake grant or still have an unfinished attempt.
 */
export const visibleTo = (me: Student) => {
  const mine = sql`${attempts.assignmentId} = ${assignments.id} and ${attempts.studentId} = ${me.id}`;
  return and(
    exists(db.select({ x: sql`1` }).from(tests).where(and(eq(tests.id, assignments.testId), eq(tests.schoolId, me.schoolId)))),
    or(
      and(
        isNull(assignments.closedAt),
        or(
          and(eq(assignments.wholeClass, true), eq(assignments.classId, me.classId)),
          exists(
            db
              .select({ x: sql`1` })
              .from(assignmentStudents)
              .where(and(eq(assignmentStudents.assignmentId, assignments.id), eq(assignmentStudents.studentId, me.id))),
          ),
        ),
      ),
      sql`(select count(*) from ${retakeGrants} where ${retakeGrants.assignmentId} = ${assignments.id} and ${retakeGrants.studentId} = ${me.id})
        >= (select count(*) from ${attempts} where ${mine})
        and exists (select 1 from ${attempts} where ${mine})`,
      sql`exists (select 1 from ${attempts} where ${mine} and ${attempts.status} <> 'finished')`,
    ),
  );
};

const scoreSql = sql`(select coalesce(sum(${answers.points}), 0) from ${answers} where ${answers.attemptId} = ${attempts.id})`;

/**
 * No cron: an attempt past its deadline, or whose assignment was closed, is finished on the next request that touches it.
 * Call it first in every read or write of attempts, with a filter for the attempts at hand.
 */
export async function finalizeDue(filter: SQL | undefined) {
  await db
    .update(attempts)
    // Closing ends the attempts that started before it; a retake started after the close runs to its own deadline.
    .set({
      status: "finished",
      finishedAt: sql`least(${attempts.deadlineAt}, case when ${attempts.startedAt} < ${assignments.closedAt} then ${assignments.closedAt} end)`,
      score: scoreSql,
    })
    .from(assignments)
    .where(
      and(
        eq(assignments.id, attempts.assignmentId),
        ne(attempts.status, "finished"),
        or(lte(attempts.deadlineAt, sql`now()`), sql`${attempts.startedAt} < ${assignments.closedAt}`),
        filter,
      ),
    );
}

/** Finishes the attempt on «Завершити». A locked attempt can't be submitted until a teacher unlocks it. */
export async function submit(attemptId: number, studentId: number) {
  await finalizeDue(eq(attempts.id, attemptId));
  await db
    .update(attempts)
    .set({ status: "finished", finishedAt: sql`now()`, score: scoreSql })
    .where(and(eq(attempts.id, attemptId), eq(attempts.studentId, studentId), eq(attempts.status, "in_progress")));
}

/** The student's own attempt, finalised first if due. Null if it isn't theirs. */
export async function attemptState(attemptId: number, studentId: number): Promise<AttemptState | null> {
  await finalizeDue(eq(attempts.id, attemptId));
  const [a] = await db
    .select({
      status: attempts.status,
      remainingMs: sql<string>`greatest(0, extract(epoch from ${attempts.deadlineAt} - now()) * 1000)`,
      startedAt: attempts.startedAt,
      deadlineAt: attempts.deadlineAt,
      finishedAt: attempts.finishedAt,
      closedAt: assignments.closedAt,
    })
    .from(attempts)
    .innerJoin(assignments, eq(assignments.id, attempts.assignmentId))
    .where(and(eq(attempts.id, attemptId), eq(attempts.studentId, studentId)));
  if (!a) return null;
  let finishReason: FinishReason | undefined;
  if (a.status === "finished") {
    if (a.finishedAt && a.finishedAt >= a.deadlineAt) finishReason = "timeout";
    else if (a.finishedAt && a.closedAt && a.startedAt < a.closedAt && a.finishedAt >= a.closedAt) finishReason = "closed";
    else finishReason = "submitted";
  }
  return { status: a.status, remainingMs: Number(a.remainingMs), finishReason };
}

/** Logs an event on an unfinished attempt and flags it; a locking event also locks it. The flag is never cleared. */
export async function recordEvent(attemptId: number, type: AttemptEventType) {
  await db.batch([
    db.insert(attemptEvents).values({ attemptId, type }),
    db
      .update(attempts)
      .set(LOCKING.has(type) ? { flagged: true, status: "locked" } : { flagged: true })
      .where(and(eq(attempts.id, attemptId), ne(attempts.status, "finished"))),
  ]);
}
