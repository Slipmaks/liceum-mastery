// The live monitor of an open assignment (PRODUCT.md › Teacher views). A closed one goes to its report.
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { assignmentStudents, students } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { EVENT_LABEL } from "@/lib/attempt";
import { getAssignment, loadResults } from "@/lib/staff";
import { hhmm, mmss, questionsLabel } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { addStudents } from "../../actions";
import { ActionForm } from "@/components/action-form";
import { Monitor, type MonitorRow } from "./monitor";

export const metadata: Metadata = { title: "Моніторинг" };

export default function MonitorPage({ params }: PageProps<"/dashboard/assignments/[id]">) {
  return (
    <Suspense>
      <Live params={params} />
    </Suspense>
  );
}

async function Live({ params }: Pick<PageProps<"/dashboard/assignments/[id]">, "params">) {
  const me = await requireStaff();
  const a = await getAssignment(Number((await params).id), me);
  if (!a) notFound();
  if (a.closedAt) redirect(`/dashboard/assignments/${a.id}/report`);
  const { questions, rows } = await loadResults(a);

  const view: MonitorRow[] = rows.map(r => {
    const t = r.attempt;
    const status = !t ? "idle" : t.status === "finished" ? "done" : t.status === "locked" ? "locked" : "writing";
    return {
      n: r.n,
      name: r.student.name,
      attemptId: t?.id ?? null,
      status,
      answered: questions.map(q => r.points.has(q.id)),
      time: !t ? "—" : t.finishedAt ? `здав о ${hhmm(t.finishedAt)}` : mmss(t.remainingMs),
      flagged: !!t?.flagged,
      lastEvent: r.events[0] ? `${EVENT_LABEL[r.events[0].type]} · ${hhmm(r.events[0].at)}` : null,
      more: Math.max(0, r.events.length - 1),
      retake: r.tries > 1,
    };
  });

  const notListed =
    a.canManage && !a.wholeClass
      ? await db
          .select({ id: students.id, name: students.name })
          .from(students)
          .where(
            and(
              eq(students.classId, a.classId),
              isNull(students.archivedAt),
              notInArray(students.id, db.select({ id: assignmentStudents.studentId }).from(assignmentStudents).where(eq(assignmentStudents.assignmentId, a.id))),
            ),
          )
      : [];

  return (
    <div className="grid gap-6">
      <Monitor
        assignmentId={a.id}
        canClose={a.canManage}
        crumb={a.subject}
        title={`${a.title} · ${a.className}`}
        meta={`${questionsLabel(questions.length)} · ліміт ${a.minutes} хв · відкрито о ${hhmm(a.openedAt)}`}
        updated={new Intl.DateTimeFormat("uk", { timeZone: "Europe/Kyiv", timeStyle: "medium" }).format(new Date())}
        rows={view}
      />
      {notListed.length > 0 && (
        <details className="max-w-xl rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Додати учнів</summary>
          <ActionForm action={addStudents} className="mt-3 justify-items-stretch gap-3">
            <input type="hidden" name="assignment" value={a.id} />
            <div className="grid gap-1 sm:grid-cols-2">
              {notListed.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="student" value={s.id} className="size-4 accent-foreground" />
                  {s.name}
                </label>
              ))}
            </div>
            <SubmitButton variant="outline" className="w-fit" pendingLabel="Додаю…">
              Додати
            </SubmitButton>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
