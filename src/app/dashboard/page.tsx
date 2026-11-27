// Staff home: what is open now, recent results, and the school's tests.
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignments, classes, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { watchable } from "@/lib/staff";
import { dayTime, hhmm } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/submit-button";
import { Plus } from "lucide-react";
import { createTest } from "./actions";

export const metadata: Metadata = { title: "Тести" };

export default function Dashboard() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const me = await requireStaff();
  const runs = (closed: boolean) =>
    db
      .select({ id: assignments.id, title: tests.title, className: classes.name, openedAt: assignments.openedAt, closedAt: assignments.closedAt })
      .from(assignments)
      .innerJoin(tests, eq(tests.id, assignments.testId))
      .innerJoin(classes, eq(classes.id, assignments.classId))
      .where(and(watchable(me), closed ? isNotNull(assignments.closedAt) : isNull(assignments.closedAt)))
      .orderBy(desc(closed ? assignments.closedAt : assignments.openedAt))
      .limit(20);
  const [open, closed, all] = await db.batch([
    runs(false),
    runs(true),
    db
      .select({ id: tests.id, title: tests.title, subject: subjects.name, grade: tests.grade, status: tests.status, author: users.name, authorId: tests.authorId })
      .from(tests)
      .innerJoin(subjects, eq(subjects.id, tests.subjectId))
      .innerJoin(users, eq(users.id, tests.authorId))
      .where(eq(tests.schoolId, me.schoolId))
      .orderBy(asc(tests.title)),
  ]);
  const mine = all.filter(t => t.authorId === me.id);
  const others = all.filter(t => t.authorId !== me.id);

  return (
    <div className="grid max-w-5xl gap-10">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold">Відкриті зараз</h1>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Зараз немає відкритих тестів. Відкрийте тест для класу на його сторінці.</p>
        ) : (
          <ul className="grid gap-2">
            {open.map(a => (
              <li key={a.id}>
                <Link href={`/dashboard/assignments/${a.id}`} className="flex items-baseline justify-between gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-muted">
                  <span className="font-medium">
                    {a.title} · {a.className}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">відкрито о {hhmm(a.openedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Результати</h2>
          <ul className="grid gap-1 text-sm">
            {closed.map(a => (
              <li key={a.id} className="flex items-baseline justify-between gap-4 border-b py-2">
                <Link href={`/dashboard/assignments/${a.id}/report`} className="font-medium underline-offset-4 hover:underline">
                  {a.title} · {a.className}
                </Link>
                <span className="text-muted-foreground tabular-nums">{dayTime(a.closedAt!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-8">
        <p className="text-sm text-muted-foreground">Тест можна створити з нуля або зробити копію будь-якого тесту школи на його сторінці.</p>
        <form action={createTest}>
          <SubmitButton pendingLabel="Створюю…">
            <Plus aria-hidden /> Новий тест
          </SubmitButton>
        </form>
      </section>

      <TestTable title="Мої тести" tests={mine} empty="У вас ще немає тестів." />
      <TestTable title="Інші тести школи" tests={others} empty="Інших тестів поки немає." />
    </div>
  );
}

function TestTable({ title, tests, empty }: { title: string; tests: { id: number; title: string; subject: string; grade: number; status: string; author: string }[]; empty: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {tests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Назва</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead className="text-right">Клас</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>Стан</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/tests/${t.id}`} className="underline-offset-4 hover:underline">
                      {t.title || "Без назви"}
                    </Link>
                  </TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.grade}</TableCell>
                  <TableCell className="text-muted-foreground">{t.author}</TableCell>
                  <TableCell className="text-muted-foreground">{t.status === "draft" ? "Чернетка" : "Використано"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
