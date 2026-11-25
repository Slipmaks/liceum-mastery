// Attempt lifecycle on the server: PRODUCT.md › Assignments, Attempt lifecycle, Anti-cheat.
import { and, eq, exists, isNotNull, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { answers, assignmentStudents, assignments, attemptEvents, attempts, tests, type AttemptEventType } from "@/db/schema";
import type { Student } from "@/lib/auth";

const LOCKING = new Set<AttemptEventType>(["hidden", "pagehide", "reopen", "fullscreen_exit", "second_device"]);
/** Events the browser may report. `reopen` and `second_device` are detected by the server. */
export const CLIENT_EVENTS = new Set<string>(["hidden", "pagehide", "fullscreen_exit", "blur", "copy", "cut", "paste", "contextmenu"]);

export type AttemptState = { status: "in_progress" | "locked" | "finished"; remainingMs: number };

/** Open assignments of the student's school that this student may see: the whole class, or listed by name. */
export const visibleTo = (me: Student) =>
  and(
    isNull(assignments.closedAt),
    exists(db.select({ x: sql`1` }).from(tests).where(and(eq(tests.id, assignments.testId), eq(tests.schoolId, me.schoolId)))),
    or(
      and(eq(assignments.wholeClass, true), eq(assignments.classId, me.classId)),
      exists(
        db
          .select({ x: sql`1` })
          .from(assignmentStudents)
          .where(and(eq(assignmentStudents.assignmentId, assignments.id), eq(assignmentStudents.studentId, me.id))),
      ),
    ),
  );

const scoreSql = sql`(select coalesce(sum(${answers.points}), 0) from ${answers} where ${answers.attemptId} = ${attempts.id})`;

/**
 * No cron: an attempt past its deadline, or whose assignment was closed, is finished on the next request that touches it.
 * Call it first in every read or write of attempts, with a filter for the attempts at hand.
 */
export async function finalizeDue(filter: SQL | undefined) {
  await db
    .update(attempts)
    .set({ status: "finished", finishedAt: sql`least(${attempts.deadlineAt}, coalesce(${assignments.closedAt}, 'infinity'))`, score: scoreSql })
    .from(assignments)
    .where(
      and(
        eq(assignments.id, attempts.assignmentId),
        ne(attempts.status, "finished"),
        or(lte(attempts.deadlineAt, sql`now()`), isNotNull(assignments.closedAt)),
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
    .select({ status: attempts.status, remainingMs: sql<string>`greatest(0, extract(epoch from ${attempts.deadlineAt} - now()) * 1000)` })
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.studentId, studentId)));
  return a ? { status: a.status, remainingMs: Number(a.remainingMs) } : null;
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
