// Student home: tests opened to this student right now. A test is invisible until the teacher opens it.
import { Suspense } from "react";
import type { Metadata } from "next";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, attempts, classes, questions, retakeGrants, subjects, tests } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { finalizeDue, visibleTo } from "@/lib/attempt";
import { questionsLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { LogoutButton } from "@/components/logout-button";
import { SubmitButton } from "@/components/submit-button";
import { startAttempt } from "./actions";

export const metadata: Metadata = { title: "Мої тести" };

export default function StudentHome() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <Suspense>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const me = await requireStudent();
  await finalizeDue(eq(attempts.studentId, me.id));
  const [[cls], open] = await db.batch([
    db.select({ name: classes.name }).from(classes).where(eq(classes.id, me.classId)),
    db
      .select({ id: assignments.id, testId: assignments.testId, title: tests.title, subject: subjects.name, minutes: tests.timeLimitMin })
      .from(assignments)
      .innerJoin(tests, eq(tests.id, assignments.testId))
      .innerJoin(subjects, eq(subjects.id, tests.subjectId))
      .where(visibleTo(me))
      .orderBy(desc(assignments.openedAt)),
  ]);
  const ids = open.map(a => a.id);
  const testIds = [...new Set(open.map(a => a.testId))];
  const [mine, grants, qCounts] = ids.length
    ? await db.batch([
        db
          .select({ assignmentId: attempts.assignmentId, status: attempts.status })
          .from(attempts)
          .where(and(eq(attempts.studentId, me.id), inArray(attempts.assignmentId, ids))),
        db
          .select({ assignmentId: retakeGrants.assignmentId, n: count() })
          .from(retakeGrants)
          .where(and(eq(retakeGrants.studentId, me.id), inArray(retakeGrants.assignmentId, ids)))
          .groupBy(retakeGrants.assignmentId),
        db
          .select({ testId: questions.testId, n: count() })
          .from(questions)
          .where(inArray(questions.testId, testIds))
          .groupBy(questions.testId),
      ])
    : [[], [], []];

  const qCountByTest = new Map(qCounts.map(q => [q.testId, q.n]));
  const items = open
    .map(a => {
      const tries = mine.filter(t => t.assignmentId === a.id);
      const allowed = 1 + (grants.find(g => g.assignmentId === a.id)?.n ?? 0);
      const resume = tries.some(t => t.status !== "finished");
      const done = !resume && tries.length >= allowed;
      return { a, tries, resume, done, qCount: qCountByTest.get(a.testId) ?? 0 };
    })
    .sort((x, y) => Number(x.done) - Number(y.done));

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{cls.name}</p>
          <h1 className="text-2xl font-semibold">{me.name}</h1>
        </div>
        <LogoutButton className="h-12 px-3 text-base" />
      </header>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Відкритих тестів поки немає. Тест з’явиться тут, коли вчитель його відкриє.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map(({ a, tries, resume, done, qCount }) => (
            <li key={a.id} className="grid gap-3 rounded-lg border bg-card p-4">
              <div className="grid gap-0.5">
                <p className="text-sm text-muted-foreground">{a.subject}</p>
                <p className="text-base font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {questionsLabel(qCount)} · {a.minutes} хв
                </p>
              </div>
              {done ? (
                <Badge className="bg-success-soft text-success">Здано</Badge>
              ) : (
                <div className="grid gap-2.5">
                  <p className="text-sm text-muted-foreground">Таймер не зупиняється · не перемикайте вкладки й не оновлюйте сторінку під час тесту.</p>
                  {resume ? (
                    <form action={startAttempt}>
                      <input type="hidden" name="assignment" value={a.id} />
                      <SubmitButton className="h-12 w-full text-base" pendingLabel="Відкриваю тест…">
                        Продовжити
                      </SubmitButton>
                    </form>
                  ) : (
                    <ConfirmForm
                      action={startAttempt}
                      variant="default"
                      title="Почати тест?"
                      message={`У вас одна спроба: ${questionsLabel(qCount)}, ${a.minutes} хв. Таймер не зупиняється. Перемикання вкладок, оновлення сторінки або вихід із повноекранного режиму призупинить тест.`}
                      confirmLabel={tries.length ? "Почати повторно" : "Почати тест"}
                      pendingLabel="Відкриваю тест…"
                    >
                      <input type="hidden" name="assignment" value={a.id} />
                      <Button type="submit" className="h-12 w-full text-base">
                        {tries.length ? "Почати повторно" : "Почати"}
                      </Button>
                    </ConfirmForm>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
