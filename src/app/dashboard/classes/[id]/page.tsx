// One class: the code students log in with, and the roster (PRODUCT.md › Student accounts).
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getClass, isAdmin, schoolTeachers } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addStudents, archiveStudent, moveStudent, resetPin, restoreStudent, updateClass } from "../actions";
import { ClassFields } from "../class-fields";

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
          <p className="font-mono text-2xl font-semibold tracking-widest">{c.code}</p>
        </div>
      </header>

      {isAdmin(me) && (
        <details className="max-w-xl rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Змінити клас</summary>
          <form action={updateClass} className="mt-3 grid gap-3">
            <input type="hidden" name="class" value={c.id} />
            <ClassFields teachers={await schoolTeachers(me.schoolId)} values={c} />
            <Button type="submit" variant="outline" className="w-fit">
              Зберегти
            </Button>
          </form>
        </details>
      )}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Учні · {active.length}</h2>
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
                          <ConfirmForm action={resetPin} message={`Скинути PIN для ${s.name}? Учень придумає новий під час наступного входу.`}>
                            <input type="hidden" name="student" value={s.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Скинути PIN
                            </Button>
                          </ConfirmForm>
                        )}
                        {others.length > 0 && (
                          <form action={moveStudent} className="flex items-center gap-1">
                            <input type="hidden" name="student" value={s.id} />
                            <select name="to" required defaultValue="" aria-label={`Перевести ${s.name} до класу`} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                              <option value="" disabled>
                                До класу…
                              </option>
                              {others.map(o => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" variant="ghost" size="sm">
                              Перевести
                            </Button>
                          </form>
                        )}
                        <ConfirmForm action={archiveStudent} message={`Перенести ${s.name} в архів? Результати учня збережуться.`}>
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
        <form action={addStudents} className="grid max-w-xl gap-2">
          <input type="hidden" name="class" value={c.id} />
          <label htmlFor="names" className="text-sm font-medium">
            Додати учнів: прізвище та ім’я, по одному в рядку
          </label>
          <textarea
            id="names"
            name="names"
            required
            rows={4}
            placeholder={"Бондаренко Аліна\nВасильченко Максим"}
            className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline" className="w-fit">
            Додати
          </Button>
        </form>
      </section>

      {archived.length > 0 && (
        <details className="max-w-xl">
          <summary className="cursor-pointer text-sm font-medium">Архів · {archived.length}</summary>
          <ul className="mt-2 grid text-sm">
            {archived.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-4 border-b py-1">
                {s.name}
                <form action={restoreStudent}>
                  <input type="hidden" name="student" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Повернути
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
