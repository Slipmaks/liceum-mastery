// Student home: tests opened to this student right now. A test is invisible until the teacher opens it.
import { Suspense } from "react";
import type { Metadata } from "next";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignments, attempts, classes, retakeGrants, subjects, tests } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { finalizeDue, visibleTo } from "@/lib/attempt";
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
      .select({ id: assignments.id, title: tests.title, subject: subjects.name, minutes: tests.timeLimitMin })
      .from(assignments)
      .innerJoin(tests, eq(tests.id, assignments.testId))
      .innerJoin(subjects, eq(subjects.id, tests.subjectId))
      .where(visibleTo(me))
      .orderBy(desc(assignments.openedAt)),
  ]);
  const ids = open.map(a => a.id);
  const [mine, grants] = ids.length
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
      ])
    : [[], []];

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{cls.name}</p>
          <h1 className="text-2xl font-semibold">{me.name}</h1>
        </div>
        <LogoutButton className="h-12 px-3 text-base" />
      </header>

      {open.length === 0 ? (
        <p className="text-muted-foreground">Відкритих тестів поки немає. Тест з’явиться тут, коли вчитель його відкриє.</p>
      ) : (
        <ul className="grid gap-3">
          {open.map(a => {
            const tries = mine.filter(t => t.assignmentId === a.id);
            const allowed = 1 + (grants.find(g => g.assignmentId === a.id)?.n ?? 0);
            const resume = tries.some(t => t.status !== "finished");
            const done = !resume && tries.length >= allowed;
            return (
              <li key={a.id} className="grid gap-3 rounded-lg border bg-card p-4">
                <div className="grid gap-0.5">
                  <p className="text-sm text-muted-foreground">{a.subject}</p>
                  <p className="text-base font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{a.minutes} хв</p>
                </div>
                {done ? (
                  <p className="w-fit rounded-sm bg-success-soft px-2 py-1 text-xs font-medium text-success">Здано</p>
                ) : (
                  <div className="grid gap-2.5">
                    <p className="text-sm text-muted-foreground">Таймер не зупиняється · не перемикайте вкладки й програми під час тесту.</p>
                    <form action={startAttempt}>
                      <input type="hidden" name="assignment" value={a.id} />
                      <SubmitButton className="h-12 w-full text-base" pendingLabel="Відкриваю тест…">
                        {resume ? "Продовжити" : tries.length ? "Почати повторно" : "Почати"}
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
