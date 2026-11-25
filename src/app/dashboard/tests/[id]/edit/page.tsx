// The builder: only the author's own draft. A locked test is read-only; its page offers a copy instead.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects, tests } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { Builder } from "./builder";

export default function EditPage({ params }: PageProps<"/dashboard/tests/[id]/edit">) {
  return (
    <Suspense>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: Pick<PageProps<"/dashboard/tests/[id]/edit">, "params">) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const [test] = Number.isInteger(id)
    ? await db.select().from(tests).where(and(eq(tests.id, id), eq(tests.schoolId, me.schoolId), eq(tests.authorId, me.id), eq(tests.status, "draft")))
    : [];
  if (!test) redirect(Number.isInteger(id) ? `/dashboard/tests/${id}` : "/dashboard");
  const [qs, subjectList] = await db.batch([
    db.select().from(questions).where(eq(questions.testId, id)).orderBy(asc(questions.position)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.schoolId, me.schoolId)),
  ]);
  const collator = new Intl.Collator("uk");
  return (
    <Builder
      testId={id}
      subjects={subjectList.sort((x, y) => collator.compare(x.name, y.name))}
      initial={{
        title: test.title,
        topic: test.topic,
        subjectId: test.subjectId,
        grade: test.grade,
        timeLimitMin: test.timeLimitMin,
        questions: qs.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, data: q.data })),
      }}
    />
  );
}
