import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, inArray } from "drizzle-orm";
import { Check } from "lucide-react";
import { db } from "@/db";
import { answers, assignments, attempts, questions, subjects, tests } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { attemptState } from "@/lib/attempt";
import { forStudent, type AnswerResponse } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { LeaveFullscreen, TestScreen } from "./test-screen";

export const metadata: Metadata = { title: "Тест" };

export default function AttemptPage({ params }: PageProps<"/student/attempt/[id]">) {
  return (
    <Suspense>
      <Attempt params={params} />
    </Suspense>
  );
}

const FINISHED_COPY = {
  submitted: {
    heading: "Вітаю! Ви завершили тест",
    note: "Усі відповіді збережено.",
  },
  timeout: {
    heading: "Час тесту вийшов",
    note: "Усі збережені відповіді автоматично надіслано.",
  },
  closed: {
    heading: "Тест завершено вчителем",
    note: "Усі збережені відповіді надіслано.",
  },
} as const;

async function Attempt({ params }: Pick<PageProps<"/student/attempt/[id]">, "params">) {
  const me = await requireStudent();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const state = await attemptState(id, me.id);
  if (!state) notFound();

  const [a] = await db
    .select({ testId: tests.id, title: tests.title, subject: subjects.name, shuffle: attempts.shuffle })
    .from(attempts)
    .innerJoin(assignments, eq(assignments.id, attempts.assignmentId))
    .innerJoin(tests, eq(tests.id, assignments.testId))
    .innerJoin(subjects, eq(subjects.id, tests.subjectId))
    .where(and(eq(attempts.id, id), eq(attempts.studentId, me.id)));

  if (state.status === "finished") {
    const copy = FINISHED_COPY[state.finishReason ?? "submitted"];
    const [[{ n: savedCount }], [{ n: totalCount }]] = await db.batch([
      db.select({ n: count() }).from(answers).where(eq(answers.attemptId, id)),
      db.select({ n: count() }).from(questions).where(eq(questions.testId, a.testId)),
    ]);
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <LeaveFullscreen />
        <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold text-balance">{copy.heading}</h1>
        <p className="max-w-sm text-pretty text-muted-foreground">
          {a.title} · {copy.note}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          Збережено відповідей: {savedCount} з {totalCount}
        </p>
        <Button asChild variant="outline" className="mt-2 h-12 px-6 text-base">
          <Link href="/student">До списку тестів</Link>
        </Button>
      </main>
    );
  }

  const qs = await db.select().from(questions).where(eq(questions.testId, a.testId));
  const byId = new Map(qs.map(q => [q.id, q]));
  // The correct answers are stripped here: only forStudent() output reaches the browser.
  const view = a.shuffle.questions.flatMap(qid => (byId.has(qid) ? [forStudent(byId.get(qid)!, a.shuffle.options[qid])] : []));
  const saved = await db
    .select({ questionId: answers.questionId, response: answers.response })
    .from(answers)
    .where(and(eq(answers.attemptId, id), inArray(answers.questionId, qs.map(q => q.id))));

  return (
    <TestScreen
      attemptId={id}
      subject={a.subject}
      title={a.title}
      questions={view}
      initialAnswers={Object.fromEntries(saved.map(s => [s.questionId, s.response as AnswerResponse]))}
      initial={state}
    />
  );
}
