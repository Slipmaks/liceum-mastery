"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignmentStudents, assignments, attemptEvents, attempts, classes, questions, retakeGrants, sessions, students, subjects, tests } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { finalizeDue } from "@/lib/attempt";
import { canOpen, getAssignment, schoolSubjects } from "@/lib/staff";
import { parseDraft, problems } from "@/lib/draft";

const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;
const ids = (fd: FormData, k: string) => fd.getAll(k).map(Number).filter(Number.isInteger);

/** «Відкрити для класу»: the whole class, or the listed students of it. The first open locks the test for good. */
export async function openTest(fd: FormData) {
  const me = await requireStaff();
  const [[test], [cls]] = await db.batch([
    db.select({ id: tests.id, authorId: tests.authorId, title: tests.title }).from(tests).where(and(eq(tests.id, num(fd, "test")), eq(tests.schoolId, me.schoolId))),
    db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, num(fd, "class")), eq(classes.schoolId, me.schoolId))),
  ]);
  if (!test || !cls || !canOpen(me, test)) redirect("/dashboard");
  const qs = await db.select({ type: questions.type, prompt: questions.prompt, points: questions.points, data: questions.data }).from(questions).where(eq(questions.testId, test.id));
  if (problems({ title: test.title, questions: qs }).length) redirect(`/dashboard/tests/${test.id}`);
  const wholeClass = fd.get("whole") === "on";
  const picked = wholeClass
    ? []
    : (
        await db
          .select({ id: students.id })
          .from(students)
          .where(and(eq(students.classId, cls.id), isNull(students.archivedAt), inArray(students.id, [0, ...ids(fd, "student")])))
      ).map(s => s.id);
  if (!wholeClass && picked.length === 0) redirect(`/dashboard/tests/${test.id}?class=${cls.id}&empty=1`);

  const [, [a]] = await db.batch([
    db.update(tests).set({ status: "locked" }).where(eq(tests.id, test.id)),
    db.insert(assignments).values({ testId: test.id, classId: cls.id, openedBy: me.id, wholeClass }).returning({ id: assignments.id }),
  ]);
  if (picked.length) await db.insert(assignmentStudents).values(picked.map(studentId => ({ assignmentId: a.id, studentId })));
  redirect(`/dashboard/assignments/${a.id}`);
}

/** While the test is open, the teacher can add students to a listed (not whole-class) assignment. */
export async function addStudents(fd: FormData) {
  const me = await requireStaff();
  const a = await getAssignment(num(fd, "assignment"), me);
  if (!a?.canManage || a.closedAt || a.wholeClass) redirect("/dashboard");
  const picked = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.classId, a.classId),
        isNull(students.archivedAt),
        inArray(students.id, [0, ...ids(fd, "student")]),
        notInArray(students.id, db.select({ id: assignmentStudents.studentId }).from(assignmentStudents).where(eq(assignmentStudents.assignmentId, a.id))),
      ),
    );
  if (picked.length) await db.insert(assignmentStudents).values(picked.map(s => ({ assignmentId: a.id, studentId: s.id })));
  revalidatePath(`/dashboard/assignments/${a.id}`);
}

/** «Закрити тест»: every attempt still running is finished at this moment. */
export async function closeAssignment(fd: FormData) {
  const me = await requireStaff();
  const a = await getAssignment(num(fd, "assignment"), me);
  if (!a?.canManage) redirect("/dashboard");
  await db.update(assignments).set({ closedAt: sql`now()` }).where(and(eq(assignments.id, a.id), isNull(assignments.closedAt)));
  await finalizeDue(eq(attempts.assignmentId, a.id));
  redirect(`/dashboard/assignments/${a.id}/report`);
}

/** The attempt and its assignment, if the caller may watch it. */
async function watchedAttempt(attemptId: number) {
  const me = await requireStaff();
  const [t] = await db.select({ assignmentId: attempts.assignmentId, studentId: attempts.studentId, status: attempts.status }).from(attempts).where(eq(attempts.id, attemptId));
  const a = t && (await getAssignment(t.assignmentId, me));
  if (!a) redirect("/dashboard");
  return { me, t, a };
}

/**
 * «Дозволити продовжити». If the lock came from a login on a second device, the student's sessions are ended too,
 * so they can log in on the device they now have; the first open there is not a reopen.
 */
export async function unlockAttempt(fd: FormData) {
  const attemptId = num(fd, "attempt");
  const { t, a } = await watchedAttempt(attemptId);
  await finalizeDue(eq(attempts.id, attemptId));
  const [cause] = await db
    .select({ type: attemptEvents.type })
    .from(attemptEvents)
    .where(and(eq(attemptEvents.attemptId, attemptId), inArray(attemptEvents.type, ["hidden", "pagehide", "reopen", "fullscreen_exit", "second_device"])))
    .orderBy(desc(attemptEvents.at))
    .limit(1);
  const [unlocked] = await db
    .update(attempts)
    .set({ status: "in_progress", opened: false })
    .where(and(eq(attempts.id, attemptId), eq(attempts.status, "locked")))
    .returning({ id: attempts.id });
  if (unlocked)
    await db.batch([
      db.insert(attemptEvents).values({ attemptId, type: "unlock" }),
      ...(cause?.type === "second_device" ? [db.delete(sessions).where(eq(sessions.studentId, t.studentId))] : []),
    ]);
  revalidatePath(`/dashboard/assignments/${a.id}`);
}

/** One more attempt for one student; the last attempt counts. A reason is required. */
export async function grantRetake(fd: FormData) {
  const attemptId = num(fd, "attempt");
  const { me, t, a } = await watchedAttempt(attemptId);
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason && t.status === "finished") {
    // Only on the student's last attempt, and only if no grant is waiting to be used.
    const [[{ tries }], [{ grants }]] = await db.batch([
      db.select({ tries: sql<number>`count(*)::int` }).from(attempts).where(and(eq(attempts.assignmentId, a.id), eq(attempts.studentId, t.studentId))),
      db.select({ grants: sql<number>`count(*)::int` }).from(retakeGrants).where(and(eq(retakeGrants.assignmentId, a.id), eq(retakeGrants.studentId, t.studentId))),
    ]);
    if (grants < tries) await db.insert(retakeGrants).values({ assignmentId: a.id, studentId: t.studentId, grantedBy: me.id, reason });
  }
  revalidatePath(`/dashboard/attempts/${attemptId}`);
}

export type AttemptActionState = { error?: string; ok?: boolean; value?: string; at?: number } | undefined;

/** The teacher's note on a flagged attempt. The flag itself is never cleared and the score is never changed. */
export async function saveComment(fd: FormData) {
  const attemptId = num(fd, "attempt");
  await watchedAttempt(attemptId);
  const comment = String(fd.get("comment") ?? "").trim();
  await db.update(attempts).set({ teacherComment: comment || null }).where(eq(attempts.id, attemptId));
  revalidatePath(`/dashboard/attempts/${attemptId}`);
}

export async function saveCommentState(_: AttemptActionState, fd: FormData): Promise<AttemptActionState> {
  const attemptId = num(fd, "attempt");
  await watchedAttempt(attemptId);
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 500);
  await db.update(attempts).set({ teacherComment: comment || null }).where(eq(attempts.id, attemptId));
  revalidatePath(`/dashboard/attempts/${attemptId}`);
  return { ok: true, value: comment, at: Date.now() };
}

export async function grantRetakeState(_: AttemptActionState, fd: FormData): Promise<AttemptActionState> {
  const attemptId = num(fd, "attempt");
  const { me, t, a } = await watchedAttempt(attemptId);
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300);
  if (!reason) return { error: "Вкажіть причину повторної спроби.", value: "", at: Date.now() };
  if (t.status !== "finished") return { error: "Поточну спробу ще не завершено.", value: reason, at: Date.now() };
  const [[{ tries }], [{ grants }]] = await db.batch([
    db.select({ tries: sql<number>`count(*)::int` }).from(attempts).where(and(eq(attempts.assignmentId, a.id), eq(attempts.studentId, t.studentId))),
    db.select({ grants: sql<number>`count(*)::int` }).from(retakeGrants).where(and(eq(retakeGrants.assignmentId, a.id), eq(retakeGrants.studentId, t.studentId))),
  ]);
  if (grants >= tries) return { error: "Повторну спробу вже надано.", value: reason, at: Date.now() };
  await db.insert(retakeGrants).values({ assignmentId: a.id, studentId: t.studentId, grantedBy: me.id, reason });
  revalidatePath(`/dashboard/attempts/${attemptId}`);
  return { ok: true, value: "", at: Date.now() };
}

// ---- test builder ----

/** «Новий тест»: an empty draft of the caller's, then straight to the builder. */
export async function createTest() {
  const me = await requireStaff();
  const [subject] = await schoolSubjects(me.schoolId);
  if (!subject) redirect("/dashboard");
  const [t] = await db
    .insert(tests)
    .values({ schoolId: me.schoolId, authorId: me.id, subjectId: subject.id, grade: 9, title: "", timeLimitMin: 20 })
    .returning({ id: tests.id });
  redirect(`/dashboard/tests/${t.id}/edit`);
}

/** «Зробити копію»: any school test becomes the caller's draft, questions included. It is how a locked test is changed. */
export async function copyTest(fd: FormData) {
  const me = await requireStaff();
  const [src] = await db.select().from(tests).where(and(eq(tests.id, num(fd, "test")), eq(tests.schoolId, me.schoolId)));
  if (!src) redirect("/dashboard");
  const qs = await db.select().from(questions).where(eq(questions.testId, src.id)).orderBy(asc(questions.position));
  const [t] = await db
    .insert(tests)
    .values({ schoolId: me.schoolId, authorId: me.id, subjectId: src.subjectId, grade: src.grade, topic: src.topic, title: `${src.title} (копія)`, timeLimitMin: src.timeLimitMin })
    .returning({ id: tests.id });
  if (qs.length) await db.insert(questions).values(qs.map(q => ({ testId: t.id, position: q.position, type: q.type, prompt: q.prompt, points: q.points, data: q.data })));
  redirect(`/dashboard/tests/${t.id}/edit`);
}

/** Builder autosave. Only the author's own draft; the questions are replaced as a whole in one transaction. */
export async function saveDraft(testId: number, input: unknown): Promise<{ ok: boolean }> {
  const me = await requireStaff();
  const draft = parseDraft(input);
  if (!draft || !Number.isInteger(testId)) return { ok: false };
  const [[test], [subject]] = await db.batch([
    db
      .select({ id: tests.id })
      .from(tests)
      .where(and(eq(tests.id, testId), eq(tests.schoolId, me.schoolId), eq(tests.authorId, me.id), eq(tests.status, "draft"))),
    db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, draft.subjectId), eq(subjects.schoolId, me.schoolId))),
  ]);
  if (!test || !subject) return { ok: false };
  // ponytail: a save racing the first «Відкрити» could still swap questions before any answer exists; answers' FK stops it after.
  await db.batch([
    db
      .update(tests)
      .set({ title: draft.title, topic: draft.topic, subjectId: draft.subjectId, grade: draft.grade, timeLimitMin: draft.timeLimitMin })
      .where(eq(tests.id, testId)),
    db.delete(questions).where(eq(questions.testId, testId)),
    ...(draft.questions.length ? [db.insert(questions).values(draft.questions.map((q, position) => ({ testId, position, ...q })))] : []),
  ]);
  return { ok: true };
}

/** Deletes the caller's draft. A test that was ever opened is locked and stays. */
export async function deleteDraft(fd: FormData) {
  const me = await requireStaff();
  await db.delete(tests).where(and(eq(tests.id, num(fd, "test")), eq(tests.schoolId, me.schoolId), eq(tests.authorId, me.id), eq(tests.status, "draft")));
  redirect("/dashboard");
}
