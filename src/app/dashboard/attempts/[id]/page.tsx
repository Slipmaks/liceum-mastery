// One student's attempt: event log, answers against the key, the teacher's comment, and retakes (PRODUCT.md › Anti-cheat, Retakes).
import { isId } from "@/lib/utils";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { LockOpen, TriangleAlert } from "lucide-react";
import { db } from "@/db";
import { answers, attemptEvents, attempts, questions, retakeGrants, students, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { EVENT_LABEL } from "@/lib/attempt";
import { getAssignment, pts } from "@/lib/staff";
import { answerLines, correctResponse, grade12, type AnswerResponse } from "@/lib/questions";
import { dayTime, hhmm } from "@/lib/format";
import { FormStatus } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { unlockAttempt } from "../../actions";
import { ActionForm } from "@/components/action-form";
import { CommentForm, RetakeForm } from "./attempt-forms";

export const metadata: Metadata = { title: "Спроба учня" };

export default function AttemptPage({ params }: PageProps<"/dashboard/attempts/[id]">) {
  return (
    <Suspense>
      <Attempt params={params} />
    </Suspense>
  );
}

const STATUS = { in_progress: "пише", locked: "заблоковано", finished: "здано" };

async function Attempt({ params }: Pick<PageProps<"/dashboard/attempts/[id]">, "params">) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const [t] = isId(id)
    ? await db.select().from(attempts).innerJoin(students, eq(students.id, attempts.studentId)).where(eq(attempts.id, id))
    : [];
  const a = t && (await getAssignment(t.attempts.assignmentId, me));
  if (!a) notFound();
  const at = t.attempts;

  const [events, given, qs, history, grants] = await db.batch([
    db.select().from(attemptEvents).where(eq(attemptEvents.attemptId, id)).orderBy(asc(attemptEvents.at)),
    db.select().from(answers).where(eq(answers.attemptId, id)),
    db.select().from(questions).where(eq(questions.testId, a.testId)).orderBy(asc(questions.position)),
    db
      .select({ id: attempts.id, startedAt: attempts.startedAt, score: attempts.score, maxScore: attempts.maxScore, status: attempts.status })
      .from(attempts)
      .where(and(eq(attempts.assignmentId, a.id), eq(attempts.studentId, at.studentId)))
      .orderBy(asc(attempts.startedAt)),
    db
      .select({ reason: retakeGrants.reason, at: retakeGrants.createdAt, by: users.name })
      .from(retakeGrants)
      .innerJoin(users, eq(users.id, retakeGrants.grantedBy))
      .where(and(eq(retakeGrants.assignmentId, a.id), eq(retakeGrants.studentId, at.studentId)))
      .orderBy(asc(retakeGrants.createdAt)),
  ]);
  const byQuestion = new Map(given.map(g => [g.questionId, g]));
  const isLast = history.at(-1)?.id === id;
  const canRetake = isLast && at.status === "finished" && grants.length < history.length;

  return (
    <div className="grid max-w-3xl gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={a.closedAt ? `/dashboard/assignments/${a.id}/report` : `/dashboard/assignments/${a.id}`} className="underline-offset-4 hover:underline">
              {a.title} · {a.className}
            </Link>
            {!a.closedAt && (
              <>
                {" · "}
                <Link href={`/dashboard/assignments/${a.id}/report`} className="underline-offset-4 hover:underline">
                  Звіт
                </Link>
              </>
            )}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            {t.students.name}
            {at.flagged && (
              <span title="Можливе списування" className="text-warning-foreground">
                <TriangleAlert className="size-5" role="img" aria-label="Можливе списування" />
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            почав {dayTime(at.startedAt)} · {STATUS[at.status]}
            {at.finishedAt && ` о ${hhmm(at.finishedAt)}`}
            {at.status === "finished" && ` · ${pts(at.score ?? 0)} з ${pts(at.maxScore)} б. · оцінка ${grade12(at.score ?? 0, at.maxScore)}`}
            {!isLast && " · це не остання спроба, рахується остання"}
          </p>
        </div>
        {at.status === "locked" && (
          <ActionForm action={unlockAttempt}>
            <input type="hidden" name="attempt" value={id} />
            <SubmitButton size="sm" pendingLabel="Розблоковую…">
              <LockOpen aria-hidden /> Дозволити продовжити
            </SubmitButton>
          </ActionForm>
        )}
      </header>

      {at.flagged && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Коментар до позначки «можливе списування»</h2>
          <p className="text-sm text-muted-foreground">Позначка лишається назавжди, а оцінку вирішує вчитель: система нічого не обнуляє.</p>
          <CommentForm attemptId={id} defaultValue={at.teacherComment ?? ""} />
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="font-semibold">Журнал подій</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Подій не було.</p>
        ) : (
          <ul className="grid text-sm">
            {events.map(e => (
              <li key={e.id} className="flex gap-4 border-b py-1.5">
                <span className="w-12 shrink-0 text-muted-foreground tabular-nums">{hhmm(e.at)}</span>
                {EVENT_LABEL[e.type]}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(history.length > 1 || grants.length > 0 || canRetake) && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Спроби</h2>
          <ul className="grid text-sm">
            {history.map((h, i) => (
              <li key={h.id} className="flex gap-4 border-b py-1.5 tabular-nums">
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                {h.id === id ? (
                  <span className="font-medium">{dayTime(h.startedAt)}</span>
                ) : (
                  <Link href={`/dashboard/attempts/${h.id}`} className="underline-offset-4 hover:underline">
                    {dayTime(h.startedAt)}
                  </Link>
                )}
                <span className="text-muted-foreground">{h.status === "finished" ? `${pts(h.score ?? 0)} з ${pts(h.maxScore)} б.` : STATUS[h.status]}</span>
              </li>
            ))}
            {grants.map(g => (
              <li key={g.at.toISOString()} className="flex gap-4 border-b py-1.5 text-muted-foreground">
                <span className="w-6" />
                Повторна спроба дозволена {dayTime(g.at)} ({g.by}): «{g.reason}»
              </li>
            ))}
          </ul>
          {canRetake ? (
            <RetakeForm attemptId={id} />
          ) : (
            isLast &&
            grants.length >= history.length &&
            grants.length > 0 && <FormStatus>Повторну спробу дозволено — учень може почати її зі свого списку тестів.</FormStatus>
          )}
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-semibold">Відповіді</h2>
        <ol className="grid gap-3">
          {qs.map((q, i) => {
            const g = byQuestion.get(q.id);
            const score = g?.points ?? 0;
            const isFull = !!g && score >= q.points;
            const isPartial = !!g && score > 0 && score < q.points;
            return (
              <li key={q.id} className="grid gap-2 rounded-lg border bg-card p-4 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium text-pretty">
                    {i + 1}. {q.prompt}
                  </p>
                  <span className={isFull ? "shrink-0 font-semibold tabular-nums" : isPartial ? "shrink-0 font-medium tabular-nums" : "shrink-0 text-muted-foreground tabular-nums"}>
                    {pts(score)}/{pts(q.points)}
                    {isPartial && <span className="ml-1.5 text-xs font-normal text-muted-foreground">частково</span>}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Відповідь учня</p>
                    {g ? (
                      answerLines(q.data, g.response as AnswerResponse).map((l, idx) => <p key={`${idx}-${l}`}>{l}</p>)
                    ) : (
                      <p className="text-muted-foreground">Немає відповіді</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Правильно</p>
                    {answerLines(q.data, correctResponse(q.data)).map((l, idx) => (
                      <p key={`${idx}-${l}`}>{l}</p>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
