// School administration for the director and deputies: staff, invites, subjects.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { invites, materials, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { assignableRanks, isAdmin, outranks } from "@/lib/staff";
import { RANK_LABEL } from "@/lib/staff-labels";
import { dayTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addSubject, archiveStaff, deleteSubject, revokeInvite, updateStaff } from "./actions";
import { InviteForm } from "./invite-form";

const collator = new Intl.Collator("uk");
const ORDER = { director: 0, deputy: 1, teacher: 2 };
const select = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";

export default function SchoolPage() {
  return (
    <Suspense>
      <School />
    </Suspense>
  );
}

async function School() {
  const me = await requireStaff();
  if (!isAdmin(me)) redirect("/dashboard");
  const [staff, pending, subjectRows] = await db.batch([
    db
      .select({ id: users.id, name: users.name, email: users.email, rank: users.rank, title: users.title })
      .from(users)
      .where(and(eq(users.schoolId, me.schoolId), isNull(users.archivedAt))),
    db
      .select({ tokenHash: invites.tokenHash, email: invites.email, rank: invites.rank, expiresAt: invites.expiresAt })
      .from(invites)
      .where(and(eq(invites.schoolId, me.schoolId), isNull(invites.usedAt), gt(invites.expiresAt, sql`now()`))),
    db
      .select({
        id: subjects.id,
        name: subjects.name,
        used: sql<boolean>`exists (select 1 from ${tests} where ${tests.subjectId} = ${subjects.id}) or exists (select 1 from ${materials} where ${materials.subjectId} = ${subjects.id})`,
      })
      .from(subjects)
      .where(eq(subjects.schoolId, me.schoolId)),
  ]);
  staff.sort((a, b) => ORDER[a.rank] - ORDER[b.rank] || collator.compare(a.name, b.name));
  subjectRows.sort((a, b) => collator.compare(a.name, b.name));
  const ranks = assignableRanks(me);

  return (
    <div className="grid max-w-4xl gap-10">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold">Працівники</h1>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Ім’я</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Права</TableHead>
                <TableHead>
                  <span className="sr-only">Дії</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map(u => (
                <TableRow key={u.id} className="align-top">
                  <TableCell>
                    <p className="font-medium">{u.name}</p>
                    {u.title && <p className="text-muted-foreground">{u.title}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{RANK_LABEL[u.rank]}</TableCell>
                  <TableCell className="text-right">
                    {outranks(me, u.rank) && (
                      <details className="text-left">
                        <summary className="cursor-pointer text-right text-sm underline-offset-4 hover:underline">Змінити</summary>
                        <div className="mt-2 grid w-72 gap-2">
                          <form action={updateStaff} className="grid gap-2">
                            <input type="hidden" name="user" value={u.id} />
                            <Input name="name" required defaultValue={u.name} aria-label="Ім’я" />
                            <Input name="title" defaultValue={u.title ?? ""} placeholder="Посада, напр. Учителька історії" aria-label="Посада" />
                            <select name="rank" defaultValue={u.rank} aria-label="Права" className={select}>
                              {ranks.map(r => (
                                <option key={r} value={r}>
                                  {RANK_LABEL[r]}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" variant="outline" size="sm" className="w-fit">
                              Зберегти
                            </Button>
                          </form>
                          <ConfirmForm action={archiveStaff} message={`Звільнити ${u.name}? Вхід буде закрито, а тести й результати залишаться.`}>
                            <input type="hidden" name="user" value={u.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Звільнити
                            </Button>
                          </ConfirmForm>
                        </div>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Запросити працівника</h2>
        <p className="text-sm text-muted-foreground">Працівник відкриє посилання, вкаже ім’я та пароль і зможе входити зі своїм email.</p>
        <InviteForm ranks={ranks} />
        {pending.length > 0 && (
          <ul className="grid text-sm">
            {pending.map(i => (
              <li key={i.tokenHash} className="flex items-center justify-between gap-4 border-b py-1.5">
                <span>
                  {i.email} · {RANK_LABEL[i.rank]} <span className="text-muted-foreground">· діє до {dayTime(i.expiresAt)}</span>
                </span>
                <form action={revokeInvite}>
                  <input type="hidden" name="invite" value={i.tokenHash} />
                  <Button type="submit" variant="ghost" size="sm">
                    Скасувати
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Предмети</h2>
        <ul className="grid gap-x-6 text-sm sm:grid-cols-2">
          {subjectRows.map(s => (
            <li key={s.id} className="flex min-h-9 items-center justify-between gap-2 border-b">
              {s.name}
              {!s.used && (
                <form action={deleteSubject}>
                  <input type="hidden" name="subject" value={s.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Видалити предмет «${s.name}»`}>
                    <Trash2 aria-hidden />
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addSubject} className="flex gap-2">
          <Input name="name" required maxLength={100} placeholder="Новий предмет" className="w-64" aria-label="Новий предмет" />
          <Button type="submit" variant="outline">
            Додати
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">Предмет, який уже використано в тестах або матеріалах, видалити не можна.</p>
      </section>
    </div>
  );
}
