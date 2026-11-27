// The builder: only the author's own draft. A locked test is read-only; its page offers a copy instead.
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, tests } from "@/db/schema";
import { schoolSubjects } from "@/lib/staff";
import { requireStaff } from "@/lib/auth";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Редактор тесту" };

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
  const [qs, subjectList] = await Promise.all([
    db.select().from(questions).where(eq(questions.testId, id)).orderBy(asc(questions.position)),
    schoolSubjects(me.schoolId),
  ]);
  return (
    <Builder
      testId={id}
      subjects={subjectList}
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
