"use client";
// Monitor table: DESIGN.md › Class table, Cheating flag. Refreshes from the server every 5 s (no WebSockets).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SheetStrip } from "@/components/sheet-strip";
import { ActionForm } from "@/components/action-form";
import { ConfirmForm } from "@/components/confirm-form";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";
import { closeAssignment, unlockAttempt } from "../../actions";

type Status = "locked" | "writing" | "done" | "idle";
export type MonitorRow = {
  n: number;
  name: string;
  attemptId: number | null;
  status: Status;
  answered: boolean[];
  time: string;
  flagged: boolean;
  lastEvent: string | null;
  more: number;
  retake: boolean;
};

const STATUS: Record<Status, { label: string; className: string }> = {
  locked: { label: "Заблоковано", className: "bg-destructive text-destructive-foreground" },
  writing: { label: "Пише", className: "border-input bg-transparent text-foreground" },
  done: { label: "Здав", className: "bg-success-soft text-success" },
  idle: { label: "Не почав", className: "bg-transparent text-muted-foreground" },
};

const FILTERS = [
  { id: "all", label: "Усі", test: () => true },
  { id: "attention", label: "Потребують уваги", test: (s: MonitorRow) => s.status === "locked" || s.flagged },
  { id: "writing", label: "Пишуть", test: (s: MonitorRow) => s.status === "writing" },
  { id: "done", label: "Здали", test: (s: MonitorRow) => s.status === "done" },
  { id: "idle", label: "Не почали", test: (s: MonitorRow) => s.status === "idle" },
] as const;

export function Monitor(props: { assignmentId: number; canClose: boolean; crumb: string; title: string; meta: string; updated: string; rows: MonitorRow[] }) {
  const { assignmentId, rows: students } = props;
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  const active = FILTERS.find(f => f.id === filter)!;
  // The table keeps the class-list order, so no row moves under the pointer; locked students surface in the
  // pinned strip above it, with the unlock there (DESIGN.md › Class table).
  const rows = students.filter(active.test).toSorted((a, b) => a.n - b.n);
  const locked = students.filter(s => s.status === "locked");
  const total = students[0]?.answered.length ?? 0;
  const writingCount = students.filter(s => s.status === "writing").length;
  const lockedCount = locked.length;

  // The tab says it too, for a teacher who switched to another tab.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = lockedCount ? `(${lockedCount}) ${base}` : base;
  }, [lockedCount]);
  const closeMessage =
    writingCount + lockedCount > 0
      ? `Зараз пишуть ${writingCount}, заблоковано ${lockedCount}. Усі незавершені роботи буде здано в поточному стані.`
      : "Усі незавершені роботи буде здано в поточному стані.";

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              Тести
            </Link>{" "}
            / {props.crumb}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{props.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">{props.meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-right text-sm text-muted-foreground tabular-nums">оновлено о {props.updated}</p>
          <Button asChild variant="outline">
            <Link href={`/dashboard/assignments/${assignmentId}/report`}>Звіт</Link>
          </Button>
          {props.canClose && (
            <ConfirmForm
              action={closeAssignment}
              title="Закрити тест для класу?"
              message={closeMessage}
              confirmLabel="Закрити тест"
              pendingLabel="Закриваю…"
            >
              <input type="hidden" name="assignment" value={assignmentId} />
              <Button type="submit" variant="outline">
                Закрити тест
              </Button>
            </ConfirmForm>
          )}
        </div>
      </header>

      <div role="group" aria-label="Фільтр учнів" className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map(f => {
          const n = students.filter(f.test).length;
          return (
            <Button
              key={f.id}
              size="sm"
              variant="outline"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="tabular-nums aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground/90"
            >
              {f.label}
              <span className={cn("ml-0.5", filter === f.id ? "opacity-80" : "text-muted-foreground")}>{n}</span>
            </Button>
          );
        })}
      </div>

      <LockedStrip students={locked} />
      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-10 text-right">№</TableHead>
              <TableHead>Учень</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Бланк</TableHead>
              <TableHead className="text-right">Час</TableHead>
              <TableHead>Події</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(s => {
              const count = s.answered.filter(Boolean).length;
              return (
                <TableRow key={s.n} className={cn(s.status === "locked" && "bg-danger-soft hover:bg-danger-soft")}>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{s.n}</TableCell>
                  <TableCell className="font-medium">
                    {s.attemptId ? (
                      <Link href={`/dashboard/attempts/${s.attemptId}`} className="underline-offset-4 hover:underline">
                        {s.name}
                      </Link>
                    ) : (
                      s.name
                    )}
                    {s.retake && <span className="ml-1.5 text-xs font-normal text-muted-foreground">повторна</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-sm border-transparent font-medium", STATUS[s.status].className)}>{STATUS[s.status].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <SheetStrip answered={s.answered} />
                      <span className="w-10 text-right tabular-nums">
                        {count}
                        <span className="text-muted-foreground">/{total}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", s.status !== "writing" && s.status !== "locked" && "text-muted-foreground")}>
                    {s.time}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {s.flagged && (
                        <span title="Можливе списування" className="text-warning-foreground">
                          <TriangleAlert className="size-4" role="img" aria-label="Можливе списування" />
                        </span>
                      )}
                      {s.lastEvent && (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {s.lastEvent}
                          {s.more > 0 && ` (+${s.more})`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">У цьому фільтрі зараз нікого немає.</p>}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <TriangleAlert className="size-4 text-warning-foreground" aria-hidden />
        Можливе списування: під час тесту була подія. Таблиця оновлюється кожні 5 секунд.
      </p>
    </div>
  );
}

/**
 * Pinned above the class table while it scrolls: who is locked right now, with the unlock. Always present,
 * one row tall when empty, so the first lock does not push the table down under the pointer.
 */
function LockedStrip({ students }: { students: MonitorRow[] }) {
  return (
    <section aria-label="Заблоковані учні" className="sticky top-0 z-10 -mx-1 mt-4 bg-background px-1 py-2">
      <p className="sr-only" aria-live="polite">
        {students.length ? `Заблоковано: ${students.map(s => s.name).join(", ")}` : "Заблокованих немає"}
      </p>
      {students.length === 0 ? (
        <p className="box-content flex h-12 items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden />
          Заблокованих немає
        </p>
      ) : (
        <ul className="grid rounded-lg border border-destructive/30 bg-danger-soft">
          {students.map(s => (
            <li key={s.n} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-destructive/15 px-3 py-1.5 last:border-b-0">
              <Lock className="size-4 shrink-0 text-destructive" aria-hidden />
              <span className="font-medium">{s.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {s.answered.filter(Boolean).length}/{s.answered.length} · {s.time}
                {s.lastEvent && ` · ${s.lastEvent}`}
              </span>
              {s.attemptId && (
                <ActionForm action={unlockAttempt} className="ml-auto justify-items-end">
                  <input type="hidden" name="attempt" value={s.attemptId} />
                  <SubmitButton size="sm" pendingLabel="Розблоковую…" aria-label={`Дозволити продовжити: ${s.name}`}>
                    <LockOpen aria-hidden />
                    Дозволити продовжити
                  </SubmitButton>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
