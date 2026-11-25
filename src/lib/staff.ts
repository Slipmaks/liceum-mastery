// Staff-side access and data for an assignment: PRODUCT.md › People and permissions, Teacher views.
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  answers, assignmentStudents, assignments, attemptEvents, attempts, classes, materials, questions, retakeGrants, students, subjects, tests,
  type AttemptEventType,
} from "@/db/schema";
import type { Staff } from "@/lib/auth";
import { finalizeDue } from "@/lib/attempt";
import { grade12 } from "@/lib/questions";

/** Director and deputy have the same rights over tests and results. */
export const isAdmin = (me: Staff) => me.rank !== "teacher";

/** Materials the caller may change: their own, or all of the school's for admins. */
export const editableMaterials = (me: Staff) => and(eq(materials.schoolId, me.schoolId), isAdmin(me) ? undefined : eq(materials.authorId, me.id));

/** May open the test to a class: admins and the author. */
export const canOpen = (me: Staff, test: { authorId: number }) => isAdmin(me) || test.authorId === me.id;

export type Assignment = NonNullable<Awaited<ReturnType<typeof getAssignment>>>;

/**
 * An assignment of the caller's school, or null when it isn't there or the caller may not see its results.
 * `canManage` (open, close, add students): admins and the test's author.
 * Watching (monitor, unlock, results, retake, comment): those plus the homeroom teacher of the class.
 */
export async function getAssignment(id: number, me: Staff) {
  if (!Number.isInteger(id)) return null;
  const [a] = await db
    .select({
      id: assignments.id,
      testId: tests.id,
      title: tests.title,
      subject: subjects.name,
      minutes: tests.timeLimitMin,
      authorId: tests.authorId,
      classId: classes.id,
      className: classes.name,
      homeroomTeacherId: classes.homeroomTeacherId,
      wholeClass: assignments.wholeClass,
      openedAt: assignments.openedAt,
      closedAt: assignments.closedAt,
    })
    .from(assignments)
    .innerJoin(tests, eq(tests.id, assignments.testId))
    .innerJoin(subjects, eq(subjects.id, tests.subjectId))
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(and(eq(assignments.id, id), eq(tests.schoolId, me.schoolId)));
  if (!a) return null;
  const canManage = canOpen(me, a);
  if (!canManage && a.homeroomTeacherId !== me.id) return null;
  return { ...a, canManage };
}

/** Assignments the caller may watch, as a filter on a query that joins tests and classes. */
export const watchable = (me: Staff) =>
  isAdmin(me) ? eq(tests.schoolId, me.schoolId) : and(eq(tests.schoolId, me.schoolId), or(eq(tests.authorId, me.id), eq(classes.homeroomTeacherId, me.id)));

export type Row = Awaited<ReturnType<typeof loadResults>>["rows"][number];

/**
 * One row per student in scope (whole class or listed, plus anyone who has an attempt), with their last attempt:
 * the last attempt counts (PRODUCT.md › Retakes). Overdue attempts are finalised first.
 */
export async function loadResults(a: Assignment) {
  await finalizeDue(eq(attempts.assignmentId, a.id));
  const [qs, roster, all, grants] = await db.batch([
    db.select({ id: questions.id, prompt: questions.prompt, points: questions.points }).from(questions).where(eq(questions.testId, a.testId)).orderBy(asc(questions.position)),
    db
      .select({ id: students.id, name: students.name })
      .from(students)
      .where(
        or(
          a.wholeClass ? and(eq(students.classId, a.classId), isNull(students.archivedAt)) : sql`false`,
          inArray(students.id, db.select({ id: assignmentStudents.studentId }).from(assignmentStudents).where(eq(assignmentStudents.assignmentId, a.id))),
          inArray(students.id, db.select({ id: attempts.studentId }).from(attempts).where(eq(attempts.assignmentId, a.id))),
        ),
      ),
    db
      .select({
        id: attempts.id,
        studentId: attempts.studentId,
        status: attempts.status,
        startedAt: attempts.startedAt,
        finishedAt: attempts.finishedAt,
        remainingMs: sql<string>`greatest(0, extract(epoch from ${attempts.deadlineAt} - now()) * 1000)`,
        score: attempts.score,
        maxScore: attempts.maxScore,
        flagged: attempts.flagged,
        comment: attempts.teacherComment,
      })
      .from(attempts)
      .where(eq(attempts.assignmentId, a.id))
      .orderBy(asc(attempts.startedAt)),
    db
      .select({ studentId: retakeGrants.studentId, n: sql<number>`count(*)::int` })
      .from(retakeGrants)
      .where(eq(retakeGrants.assignmentId, a.id))
      .groupBy(retakeGrants.studentId),
  ]);

  const last = new Map(all.map(t => [t.studentId, t])); // ordered by start, so the last one wins
  const ids = [...last.values()].map(t => t.id);
  const [given, events] = ids.length
    ? await db.batch([
        db.select({ attemptId: answers.attemptId, questionId: answers.questionId, points: answers.points }).from(answers).where(inArray(answers.attemptId, ids)),
        db
          .select({ attemptId: attemptEvents.attemptId, type: attemptEvents.type, at: attemptEvents.at })
          .from(attemptEvents)
          .where(inArray(attemptEvents.attemptId, ids))
          .orderBy(desc(attemptEvents.at)),
      ])
    : [[], []];

  const collator = new Intl.Collator("uk");
  const rows = roster
    .sort((x, y) => collator.compare(x.name, y.name))
    .map((s, i) => {
      const t = last.get(s.id) ?? null;
      const mine = t ? given.filter(g => g.attemptId === t.id) : [];
      const evs = t ? events.filter(e => e.attemptId === t.id && e.type !== "unlock") : [];
      const tries = all.filter(t => t.studentId === s.id).length;
      return {
        n: i + 1,
        student: s,
        attempt: t && { ...t, remainingMs: Number(t.remainingMs) },
        points: new Map(mine.map(g => [g.questionId, g.points])),
        events: evs as { type: AttemptEventType; at: Date }[],
        tries,
        unusedGrant: (grants.find(g => g.studentId === s.id)?.n ?? 0) >= tries && tries > 0,
      };
    });
  return { questions: qs, rows };
}

/**
 * The report: students × questions with points, total, 12-point grade, flag and retake marker,
 * and per question the share of finished students with full points.
 */
export async function buildReport(a: Assignment) {
  const { questions, rows } = await loadResults(a);
  const lines = rows.map(r => {
    const t = r.attempt;
    const done = t?.status === "finished";
    return {
      ...r,
      cells: questions.map(q => (t ? (r.points.get(q.id) ?? 0) : null)),
      score: done ? (t.score ?? 0) : null,
      grade: done ? grade12(t.score ?? 0, t.maxScore) : null,
      state: !t ? "не писав" : done ? "" : "пише",
    };
  });
  const finished = lines.filter(l => l.score !== null);
  const correct = questions.map(q =>
    finished.length ? Math.round((100 * finished.filter(l => (l.points.get(q.id) ?? 0) >= q.points).length) / finished.length) : null,
  );
  return { questions, lines, correct, max: questions.reduce((s, q) => s + q.points, 0) };
}

/** Points with at most 2 decimals, Ukrainian decimal comma: 0,67. */
export const pts = (n: number) => new Intl.NumberFormat("uk", { maximumFractionDigits: 2 }).format(n);

/** The school's subjects in Ukrainian alphabetical order (the database collation puts «І» before «А»). */
export async function schoolSubjects(schoolId: number) {
  const list = await db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.schoolId, schoolId));
  const collator = new Intl.Collator("uk");
  return list.sort((a, b) => collator.compare(a.name, b.name));
}
