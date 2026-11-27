// School administration for the director and deputies: staff, invites, subjects.
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { invites, materials, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { assignableRanks, isAdmin, outranks } from "@/lib/staff";
import { RANK_LABEL } from "@/lib/staff-labels";
import { dayTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { SubmitButton } from "@/components/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSubject, restoreStaff, revokeInvite } from "./actions";
import { ActionForm } from "@/components/action-form";
import { InviteForm } from "./invite-form";
import { AddSubjectForm, StaffEditDialog } from "./school-forms";

export const metadata: Metadata = { title: "Школа" };

const collator = new Intl.Collator("uk");
const ORDER = { director: 0, deputy: 1, teacher: 2 };

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
  const [staff, archivedStaff, pending, rawSubjects, usedTests, usedMaterials] = await db.batch([
    db
      .select({ id: users.id, name: users.name, email: users.email, rank: users.rank, title: users.title })
      .from(users)
      .where(and(eq(users.schoolId, me.schoolId), isNull(users.archivedAt))),
    db
      .select({ id: users.id, name: users.name, email: users.email, rank: users.rank })
      .from(users)
      .where(and(eq(users.schoolId, me.schoolId), isNotNull(users.archivedAt))),
    db
      .select({ tokenHash: invites.tokenHash, email: invites.email, rank: invites.rank, expiresAt: invites.expiresAt })
      .from(invites)
      .where(and(eq(invites.schoolId, me.schoolId), isNull(invites.usedAt), gt(invites.expiresAt, sql`now()`))),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.schoolId, me.schoolId)),
    db.selectDistinct({ id: tests.subjectId }).from(tests).where(eq(tests.schoolId, me.schoolId)),
    db.selectDistinct({ id: materials.subjectId }).from(materials).where(eq(materials.schoolId, me.schoolId)),
  ]);
  const usedIds = new Set([...usedTests.map(r => r.id), ...usedMaterials.map(r => r.id)]);
  const subjectRows = rawSubjects.map(s => ({ ...s, used: usedIds.has(s.id) }));
  staff.sort((a, b) => ORDER[a.rank] - ORDER[b.rank] || collator.compare(a.name, b.name));
  archivedStaff.sort((a, b) => collator.compare(a.name, b.name));
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
                      <StaffEditDialog
                        user={{ id: u.id, name: u.name, title: u.title ?? "", rank: u.rank }}
                        ranks={ranks}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {archivedStaff.length > 0 && (
          <details className="max-w-xl">
            <summary className="cursor-pointer text-sm font-medium tabular-nums">Архів працівників · {archivedStaff.length}</summary>
            <ul className="mt-2 grid text-sm">
              {archivedStaff.map(u => (
                <li key={u.id} className="flex items-center justify-between gap-4 border-b py-1.5">
                  <span>
                    {u.name} <span className="text-muted-foreground">· {u.email} · {RANK_LABEL[u.rank]}</span>
                  </span>
                  {outranks(me, u.rank) && (
                    <ActionForm action={restoreStaff} className="justify-items-end">
                      <input type="hidden" name="user" value={u.id} />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="Повертаю…">
                        Повернути
                      </SubmitButton>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
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
                  {i.email} · {RANK_LABEL[i.rank]} <span className="text-muted-foreground tabular-nums">· діє до {dayTime(i.expiresAt)}</span>
                </span>
                <ActionForm action={revokeInvite} className="justify-items-end">
                  <input type="hidden" name="invite" value={i.tokenHash} />
                  <SubmitButton variant="ghost" size="sm" pendingLabel="Скасовую…">
                    Скасувати
                  </SubmitButton>
                </ActionForm>
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
                <ConfirmForm
                  action={deleteSubject}
                  title="Видалити предмет?"
                  message={`Видалити предмет «${s.name}»?`}
                  confirmLabel="Видалити"
                  pendingLabel="Видаляю…"
                >
                  <input type="hidden" name="subject" value={s.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Видалити предмет «${s.name}»`}>
                    <Trash2 aria-hidden />
                  </Button>
                </ConfirmForm>
              )}
            </li>
          ))}
        </ul>
        <AddSubjectForm />
        <p className="text-sm text-muted-foreground">Предмет, який уже використано в тестах або матеріалах, видалити не можна.</p>
      </section>
    </div>
  );
}
