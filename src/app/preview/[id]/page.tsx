// «Переглянути як учень»: the student's screen for any test of the school, shuffled as a student would get it, saving nothing.
// Outside /dashboard so the staff sidebar doesn't frame it.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects, tests } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { forStudent, makeShuffle } from "@/lib/questions";
import { TestScreen } from "@/app/student/attempt/[id]/test-screen";

export default function PreviewPage({ params }: PageProps<"/preview/[id]">) {
  return (
    <Suspense>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/preview/[id]">, "params">) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const [test] = Number.isInteger(id)
    ? await db
        .select({ title: tests.title, minutes: tests.timeLimitMin, subject: subjects.name })
        .from(tests)
        .innerJoin(subjects, eq(subjects.id, tests.subjectId))
        .where(and(eq(tests.id, id), eq(tests.schoolId, me.schoolId)))
    : [];
  if (!test) notFound();
  const qs = await db.select().from(questions).where(eq(questions.testId, id));
  if (qs.length === 0) return <p className="p-6 text-muted-foreground">У тесті ще немає питань.</p>;
  const shuffle = makeShuffle(qs);
  const byId = new Map(qs.map(q => [q.id, q]));
  return (
    <TestScreen
      preview
      attemptId={0}
      subject={test.subject}
      title={test.title || "Новий тест"}
      questions={shuffle.questions.map(qid => forStudent(byId.get(qid)!, shuffle.options[qid]))}
      initialAnswers={{}}
      initial={{ status: "in_progress", remainingMs: test.minutes * 60_000 }}
    />
  );
}
