// A test as staff see it: every teacher of the school may read it (PRODUCT.md › Tests). Admins and the author open it to a class.
import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, questions, students, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { canOpen, watchable } from "@/lib/staff";
import { answerLines, correctResponse, TYPE_LABEL } from "@/lib/questions";
import { dayTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { openTest } from "../../actions";

const collator = new Intl.Collator("uk");

export default function TestPage(props: PageProps<"/dashboard/tests/[id]">) {
  return (
    <Suspense>
      <Test {...props} />
    </Suspense>
  );
}

async function Test({ params, searchParams }: PageProps<"/dashboard/tests/[id]">) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const sp = await searchParams;
  const [test] = Number.isInteger(id)
    ? await db
        .select({ id: tests.id, title: tests.title, subject: subjects.name, grade: tests.grade, topic: tests.topic, minutes: tests.timeLimitMin, status: tests.status, authorId: tests.authorId, author: users.name })
        .from(tests)
        .innerJoin(subjects, eq(subjects.id, tests.subjectId))
        .innerJoin(users, eq(users.id, tests.authorId))
        .where(and(eq(tests.id, id), eq(tests.schoolId, me.schoolId)))
    : [];
  if (!test) notFound();

  const [qs, runs, classList] = await db.batch([
    db.select().from(questions).where(eq(questions.testId, id)).orderBy(asc(questions.position)),
    db
      .select({ id: assignments.id, className: classes.name, openedAt: assignments.openedAt, closedAt: assignments.closedAt })
      .from(assignments)
      .innerJoin(tests, eq(tests.id, assignments.testId))
      .innerJoin(classes, eq(classes.id, assignments.classId))
      .where(and(eq(assignments.testId, id), watchable(me)))
      .orderBy(desc(assignments.openedAt)),
    db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.schoolId, me.schoolId)),
  ]);
  classList.sort((a, b) => collator.compare(a.name, b.name));
  const total = qs.reduce((s, q) => s + q.points, 0);

  return (
    <div className="grid max-w-3xl gap-8">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Тести
          </Link>{" "}
          / {test.subject}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{test.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {test.grade} клас · {qs.length} питань · {total} балів · {test.minutes} хв · {test.author}
        </p>
        {test.status === "locked" && (
          <p className="mt-2 text-sm text-muted-foreground">Тест уже відкривали для класу, тому його не можна змінити. Щоб змінити, зробіть копію.</p>
        )}
      </header>

      {canOpen(me, test) && (
        <section className="grid gap-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Відкрити для класу</h2>
          <Form action={`/dashboard/tests/${id}`} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1.5 text-sm">
              Клас
              <select name="class" defaultValue={String(sp.class ?? "")} className="h-9 rounded-md border border-input bg-background px-2.5">
                <option value="" disabled>
                  Оберіть клас
                </option>
                {classList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline">
              Далі
            </Button>
          </Form>
          {sp.class && <OpenForm testId={id} classId={Number(sp.class)} schoolId={me.schoolId} empty={!!sp.empty} />}
        </section>
      )}

      {runs.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Відкриття</h2>
          <ul className="grid text-sm">
            {runs.map(r => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 border-b py-2">
                <Link
                  href={`/dashboard/assignments/${r.id}${r.closedAt ? "/report" : ""}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {r.className}
                </Link>
                <span className="text-muted-foreground tabular-nums">
                  {dayTime(r.openedAt)} · {r.closedAt ? "закрито" : "відкрито зараз"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">Питання</h2>
        <ol className="grid gap-4">
          {qs.map((q, i) => {
            const correct = "options" in q.data ? q.data.correct : [];
            return (
            <li key={q.id} className="grid gap-2 rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground tabular-nums">
                {i + 1}. {TYPE_LABEL[q.type]} · {q.points} б.
              </p>
              <p className="font-medium text-pretty">{q.prompt}</p>
              <ul className="grid gap-1 text-sm">
                {"options" in q.data
                  ? q.data.options.map(o => (
                      <li key={o.id} className={correct.includes(o.id) ? "font-medium" : "text-muted-foreground"}>
                        {correct.includes(o.id) ? "✓ " : "· "}
                        {o.text}
                      </li>
                    ))
                  : answerLines(q.data, correctResponse(q.data)).map(line => <li key={line}>{line}</li>)}
              </ul>
            </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

async function OpenForm({ testId, classId, schoolId, empty }: { testId: number; classId: number; schoolId: number; empty: boolean }) {
  const roster = Number.isInteger(classId)
    ? await db
        .select({ id: students.id, name: students.name })
        .from(students)
        .innerJoin(classes, eq(classes.id, students.classId))
        .where(and(eq(students.classId, classId), eq(classes.schoolId, schoolId), isNull(students.archivedAt)))
    : [];
  if (roster.length === 0) return <p className="text-sm text-muted-foreground">У цьому класі немає учнів.</p>;
  roster.sort((a, b) => collator.compare(a.name, b.name));
  return (
    <form action={openTest} className="group grid gap-3 border-t pt-3">
      <input type="hidden" name="test" value={testId} />
      <input type="hidden" name="class" value={classId} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="whole" defaultChecked className="size-4 accent-foreground" />
        Увесь клас, разом з учнями, які приєднаються пізніше
      </label>
      <fieldset className="grid gap-1 group-has-[input[name=whole]:checked]:hidden sm:grid-cols-2">
        <legend className="mb-1 text-sm text-muted-foreground">Або оберіть учнів (наприклад, тих, хто був відсутній):</legend>
        {roster.map(s => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="student" value={s.id} className="size-4 accent-foreground" />
            {s.name}
          </label>
        ))}
      </fieldset>
      <FormError>{empty ? "Оберіть хоча б одного учня або весь клас." : undefined}</FormError>
      <Button type="submit" className="w-fit">
        Відкрити тест
      </Button>
    </form>
  );
}
