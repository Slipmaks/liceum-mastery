// One class: the code students log in with, and the roster (PRODUCT.md › Student accounts).
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getClass, isAdmin, schoolTeachers } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmForm } from "@/components/confirm-form";
import { SubmitButton } from "@/components/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveStudent, moveStudent, resetPin, restoreStudent } from "../actions";
import { AddStudentsForm, UpdateClassForm } from "../class-forms";

export const metadata: Metadata = { title: "Клас" };

const collator = new Intl.Collator("uk", { numeric: true });

export default function ClassPage({ params }: PageProps<"/dashboard/classes/[id]">) {
  return (
    <Suspense>
      <Roster params={params} />
    </Suspense>
  );
}

async function Roster({ params }: Pick<PageProps<"/dashboard/classes/[id]">, "params">) {
  const me = await requireStaff();
  const c = await getClass(Number((await params).id), me);
  if (!c) notFound();
  const [roster, others] = await db.batch([
    db
      .select({
        id: students.id,
        name: students.name,
        hasPin: sql<boolean>`${students.pinHash} is not null`,
        locked: sql<boolean>`coalesce(${students.lockedUntil} > now(), false)`,
        archived: sql<boolean>`${students.archivedAt} is not null`,
      })
      .from(students)
      .where(eq(students.classId, c.id)),
    db.select({ id: classes.id, name: classes.name }).from(classes).where(and(eq(classes.schoolId, me.schoolId), ne(classes.id, c.id))),
  ]);
  roster.sort((a, b) => collator.compare(a.name, b.name));
  others.sort((a, b) => collator.compare(a.name, b.name));
  const active = roster.filter(s => !s.archived);
  const archived = roster.filter(s => s.archived);

  return (
    <div className="grid max-w-4xl gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/classes" className="underline-offset-4 hover:underline">
              Класи
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{c.name}</h1>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-right">
          <p className="text-sm text-muted-foreground">Код для входу учнів</p>
          <p className="font-mono text-2xl font-semibold tracking-widest tabular-nums">{c.code}</p>
        </div>
      </header>

      {isAdmin(me) && (
        <details className="max-w-xl rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Змінити клас</summary>
          <UpdateClassForm classId={c.id} teachers={await schoolTeachers(me.schoolId)} values={c} />
        </details>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold tabular-nums">Учні · {active.length}</h2>
        {active.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-10 text-right">№</TableHead>
                  <TableHead>Учень</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>
                    <span className="sr-only">Дії</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.locked ? "вхід заблоковано на 15 хв" : s.hasPin ? "встановлено" : "ще не входив"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {(s.hasPin || s.locked) && (
                          <ConfirmForm
                            action={resetPin}
                            title="Скинути PIN учня?"
                            message={`Скинути PIN для ${s.name}? Учень придумає новий під час наступного входу.`}
                            confirmLabel="Скинути PIN"
                            pendingLabel="Скидаю…"
                          >
                            <input type="hidden" name="student" value={s.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Скинути PIN
                            </Button>
                          </ConfirmForm>
                        )}
                        {others.length > 0 && (
                          <form action={moveStudent} className="flex items-center gap-1">
                            <input type="hidden" name="student" value={s.id} />
                            <Select name="to" required defaultValue="" aria-label={`Перевести ${s.name} до класу`} className="h-8 px-2">
                              <option value="" disabled>
                                До класу…
                              </option>
                              {others.map(o => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </Select>
                            <SubmitButton variant="ghost" size="sm" pendingLabel="Переводжу…">
                              Перевести
                            </SubmitButton>
                          </form>
                        )}
                        <ConfirmForm
                          action={archiveStudent}
                          title="Перенести учня в архів?"
                          message={`Перенести ${s.name} в архів? Результати учня збережуться.`}
                          confirmLabel="В архів"
                          pendingLabel="Архівую…"
                        >
                          <input type="hidden" name="student" value={s.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            В архів
                          </Button>
                        </ConfirmForm>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <AddStudentsForm classId={c.id} />
      </section>

      {archived.length > 0 && (
        <details className="max-w-xl">
          <summary className="cursor-pointer text-sm font-medium tabular-nums">Архів · {archived.length}</summary>
          <ul className="mt-2 grid text-sm">
            {archived.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-4 border-b py-1">
                {s.name}
                <form action={restoreStudent}>
                  <input type="hidden" name="student" value={s.id} />
                  <SubmitButton variant="ghost" size="sm" pendingLabel="Повертаю…">
                    Повернути
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
