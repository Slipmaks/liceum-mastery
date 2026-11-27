// Classes: admins see and create all of them; a homeroom teacher sees their own.
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { isAdmin, schoolTeachers } from "@/lib/staff";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateClassForm } from "./class-forms";

export const metadata: Metadata = { title: "Класи" };

const collator = new Intl.Collator("uk", { numeric: true });

export default function ClassesPage() {
  return (
    <Suspense>
      <Classes />
    </Suspense>
  );
}

async function Classes() {
  const me = await requireStaff();
  const admin = isAdmin(me);
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      teacher: users.name,
      count: sql<number>`(select count(*)::int from ${students} where ${students.classId} = ${classes.id} and ${students.archivedAt} is null)`,
    })
    .from(classes)
    .leftJoin(users, eq(users.id, classes.homeroomTeacherId))
    .where(and(eq(classes.schoolId, me.schoolId), admin ? undefined : eq(classes.homeroomTeacherId, me.id)));
  rows.sort((a, b) => collator.compare(a.name, b.name));

  return (
    <div className="grid max-w-4xl gap-8">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold">Класи</h1>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{admin ? "Класів ще немає." : "Ви не є класним керівником жодного класу."}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead>Клас</TableHead>
                  <TableHead>Код для учнів</TableHead>
                  <TableHead>Класний керівник</TableHead>
                  <TableHead className="text-right">Учнів</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/classes/${c.id}`} className="underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{c.code}</TableCell>
                    <TableCell className={c.teacher ? "" : "text-muted-foreground"}>{c.teacher ?? "не призначено"}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {admin && (
        <section className="grid max-w-xl gap-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Новий клас</h2>
          <CreateClassForm teachers={await schoolTeachers(me.schoolId)} />
          <p className="text-sm text-muted-foreground">Код для входу учнів створиться автоматично. Список учнів додасте на сторінці класу.</p>
        </section>
      )}
    </div>
  );
}
