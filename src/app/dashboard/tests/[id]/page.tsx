// A test as staff see it: every teacher of the school may read it (PRODUCT.md › Tests). Admins and the author open it to a class.
import { isId } from "@/lib/utils";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, questions, students, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { canOpen, watchable } from "@/lib/staff";
import { answerLines, correctResponse } from "@/lib/questions";
import { problems, TYPE_LABEL } from "@/lib/draft";
import { dayTime, questionsLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { copyTest, deleteDraft } from "../../actions";
import { ConfirmForm } from "@/components/confirm-form";
import { ClassPicker, OpenFormClient } from "./open-form";

export const metadata: Metadata = { title: "Тест" };

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
  const [test] = isId(id)
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
  const picked = classList.find(c => String(c.id) === sp.class);
  const total = qs.reduce((s, q) => s + q.points, 0);
  const todo = problems({ title: test.title, questions: qs });
  const editable = test.status === "draft" && test.authorId === me.id;

  return (
    <div className="grid max-w-3xl gap-8">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Тести
          </Link>{" "}
          / {test.subject}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{test.title || "Без назви"}</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {test.grade} клас{test.topic ? ` · ${test.topic}` : ""} · {questionsLabel(qs.length)} · {total} балів · {test.minutes} хв · {test.author}
        </p>
        {test.status === "locked" && (
          <p className="mt-2 text-sm text-muted-foreground">Тест уже відкривали для класу, тому його не можна змінити. Щоб змінити, зробіть копію.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {editable && (
            <Button asChild variant={sp.class ? "outline" : "default"}>
              <Link href={`/dashboard/tests/${id}/edit`}>
                <Pencil aria-hidden /> Редагувати
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={`/preview/${id}`} target="_blank" rel="noreferrer">
              <Eye aria-hidden /> Переглянути як учень
            </a>
          </Button>
          <form action={copyTest}>
            <input type="hidden" name="test" value={id} />
            <SubmitButton variant="outline" pendingLabel="Копіюю…">
              <Copy aria-hidden /> Зробити копію
            </SubmitButton>
          </form>
          {editable && (
            <ConfirmForm
              action={deleteDraft}
              title="Видалити чернетку?"
              message="Видалити цю чернетку разом з питаннями? Цю дію не можна скасувати."
              confirmLabel="Видалити чернетку"
              pendingLabel="Видаляю…"
            >
              <input type="hidden" name="test" value={id} />
              <Button type="submit" variant="ghost">
                <Trash2 aria-hidden /> Видалити
              </Button>
            </ConfirmForm>
          )}
        </div>
      </header>

      {canOpen(me, test) && todo.length > 0 && (
        <section className="grid gap-1 rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium">Тест ще не можна відкрити для класу:</p>
          <ul className="list-disc pl-5">
            {todo.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {canOpen(me, test) && todo.length === 0 && (
        <section className="grid gap-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Відкрити для класу</h2>
          {test.status === "draft" && <p className="text-sm text-muted-foreground">Після першого відкриття тест не можна буде змінити.</p>}
          <ClassPicker key={String(sp.class ?? "")} testId={id} classes={classList} value={String(sp.class ?? "")} />
          {picked ? (
            <OpenForm testId={id} classId={picked.id} classTitle={picked.name} schoolId={me.schoolId} empty={!!sp.empty} isDraft={test.status === "draft"} />
          ) : (
            sp.class && <p className="text-sm text-muted-foreground">Цього класу вже немає. Оберіть інший.</p>
          )}
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
            const extras =
              "pairs" in q.data
                ? (() => {
                    const used = new Set(Object.values(q.data.pairs));
                    return q.data.right.filter(r => !used.has(r.id)).map(r => r.text);
                  })()
                : [];
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
                {extras.length > 0 && <li className="text-muted-foreground">Зайві варіанти: {extras.join(", ")}</li>}
              </ul>
            </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

async function OpenForm({ testId, classId, classTitle, schoolId, empty, isDraft }: { testId: number; classId: number; classTitle: string; schoolId: number; empty: boolean; isDraft: boolean }) {
  const roster = Number.isInteger(classId)
    ? await db
        .select({ id: students.id, name: students.name })
        .from(students)
        .innerJoin(classes, eq(classes.id, students.classId))
        .where(and(eq(students.classId, classId), eq(classes.schoolId, schoolId), isNull(students.archivedAt)))
    : [];
  if (roster.length === 0) return <p className="text-sm text-muted-foreground">У цьому класі немає учнів.</p>;
  roster.sort((a, b) => collator.compare(a.name, b.name));
  return <OpenFormClient key={`${classId}-${empty ? 1 : 0}`} testId={testId} classId={classId} classTitle={classTitle} roster={roster} empty={empty} isDraft={isDraft} />;
}
