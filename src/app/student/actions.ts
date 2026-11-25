"use server";
import { redirect } from "next/navigation";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { answers, assignments, attempts, questions, retakeGrants, tests } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { attemptState, finalizeDue, recordEvent, submit, visibleTo, type AttemptState } from "@/lib/attempt";
import { isValidResponse, makeShuffle, scoreAnswer } from "@/lib/questions";

const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const FINISHED: AttemptState = { status: "finished", remainingMs: 0 };

/** «Почати»: starts an attempt if one is allowed (attempts < 1 + retake grants), or resumes the unfinished one. */
export async function startAttempt(fd: FormData) {
  const me = await requireStudent();
  const [a] = await db
    .select({ id: assignments.id, testId: assignments.testId, minutes: tests.timeLimitMin })
    .from(assignments)
    .innerJoin(tests, eq(tests.id, assignments.testId))
    .where(and(eq(assignments.id, Number(fd.get("assignment")) || 0), visibleTo(me)));
  if (!a) redirect("/student");

  const mine = and(eq(attempts.assignmentId, a.id), eq(attempts.studentId, me.id));
  await finalizeDue(mine);
  const [open] = await db.select({ id: attempts.id }).from(attempts).where(and(mine, ne(attempts.status, "finished")));
  if (open) redirect(`/student/attempt/${open.id}`);

  const [[{ used }], [{ grants }]] = await db.batch([
    db.select({ used: count() }).from(attempts).where(mine),
    db.select({ grants: count() }).from(retakeGrants).where(and(eq(retakeGrants.assignmentId, a.id), eq(retakeGrants.studentId, me.id))),
  ]);
  if (used >= 1 + grants) redirect("/student");

  const qs = await db.select({ id: questions.id, data: questions.data, points: questions.points }).from(questions).where(eq(questions.testId, a.testId));
  const [created] = await db
    .insert(attempts)
    .values({
      assignmentId: a.id,
      studentId: me.id,
      classId: me.classId,
      deadlineAt: sql`now() + make_interval(mins => ${a.minutes})`,
      shuffle: makeShuffle(qs),
      maxScore: qs.reduce((s, q) => s + q.points, 0),
    })
    // A parallel «Почати» already started one: the unique index keeps a single unfinished attempt.
    .onConflictDoNothing()
    .returning({ id: attempts.id });
  const id = created?.id ?? (await db.select({ id: attempts.id }).from(attempts).where(and(mine, ne(attempts.status, "finished"))))[0]?.id;
  redirect(id ? `/student/attempt/${id}` : "/student");
}

/** Called once when the attempt page mounts. The first open is free; any later open is a `reopen` and locks. */
export async function openAttempt(attemptId: number): Promise<AttemptState> {
  const me = await requireStudent();
  if (!isId(attemptId)) return FINISHED;
  const state = await attemptState(attemptId, me.id);
  if (!state || state.status === "finished") return FINISHED;
  const [first] = await db
    .update(attempts)
    .set({ opened: true })
    .where(and(eq(attempts.id, attemptId), eq(attempts.opened, false)))
    .returning({ id: attempts.id });
  if (first) return state;
  await recordEvent(attemptId, "reopen");
  return { ...state, status: "locked" };
}

/** Polled while locked, to notice the teacher's unlock. */
export async function pollAttempt(attemptId: number): Promise<AttemptState> {
  const me = await requireStudent();
  return (isId(attemptId) && (await attemptState(attemptId, me.id))) || FINISHED;
}

/** Saves one answer at once; `null` clears it. Refused unless the attempt is in progress, which also means before the deadline. */
export async function saveAnswer(attemptId: number, questionId: number, response: unknown): Promise<AttemptState> {
  const me = await requireStudent();
  if (!isId(attemptId) || !isId(questionId)) throw new Error("Bad request");
  const state = await attemptState(attemptId, me.id);
  if (!state) throw new Error("Not found");
  if (state.status !== "in_progress") return state;

  const [q] = await db
    .select({ type: questions.type, points: questions.points, data: questions.data })
    .from(attempts)
    .innerJoin(assignments, eq(assignments.id, attempts.assignmentId))
    .innerJoin(questions, and(eq(questions.testId, assignments.testId), eq(questions.id, questionId)))
    .where(eq(attempts.id, attemptId));
  if (!q) throw new Error("Not found");

  const key = and(eq(answers.attemptId, attemptId), eq(answers.questionId, questionId));
  if (response === null) {
    await db.delete(answers).where(key);
  } else {
    if (!isValidResponse(q, response)) throw new Error("Bad response");
    const points = scoreAnswer(q, response);
    await db
      .insert(answers)
      .values({ attemptId, questionId, response, points })
      .onConflictDoUpdate({ target: [answers.attemptId, answers.questionId], set: { response, points, updatedAt: sql`now()` } });
  }
  return state;
}

/** «Завершити тест». */
export async function submitAttempt(attemptId: number) {
  const me = await requireStudent();
  if (!isId(attemptId)) redirect("/student");
  await submit(attemptId, me.id);
  redirect(`/student/attempt/${attemptId}`);
}
