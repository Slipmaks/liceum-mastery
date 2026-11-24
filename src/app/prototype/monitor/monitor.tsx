"use client";

import { useState } from "react";
import { BarChart3, FileText, Library, LockOpen, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SheetStrip } from "@/components/sheet-strip";
import { cn } from "@/lib/utils";
import { STUDENTS, TOTAL, type Status, type Student } from "./data";

const STATUS: Record<Status, { label: string; className: string }> = {
  locked: { label: "Заблоковано", className: "bg-destructive text-white" },
  writing: { label: "Пише", className: "border-input bg-transparent text-foreground" },
  done: { label: "Здав", className: "bg-success-soft text-success" },
  idle: { label: "Не почав", className: "bg-transparent text-muted-foreground" },
};

const FILTERS = [
  { id: "all", label: "Усі", test: () => true },
  { id: "attention", label: "Потребують уваги", test: (s: Student) => s.status === "locked" || s.flagged },
  { id: "writing", label: "Пишуть", test: (s: Student) => s.status === "writing" },
  { id: "done", label: "Здали", test: (s: Student) => s.status === "done" },
  { id: "idle", label: "Не почали", test: (s: Student) => s.status === "idle" },
] as const;

const NAV = [
  { label: "Класи", icon: Users },
  { label: "Тести", icon: FileText, current: true },
  { label: "Результати", icon: BarChart3 },
  { label: "Матеріали", icon: Library },
];

export function Monitor() {
  const [students, setStudents] = useState(STUDENTS);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const unlock = (id: number) =>
    setStudents(list =>
      list.map(s =>
        s.id === id ? { ...s, status: "writing", events: [...s.events, { label: "Розблоковано вчителем", at: "10:24" }] } : s,
      ),
    );

  const active = FILTERS.find(f => f.id === filter)!;
  // Locked first (they need the teacher now), then flagged, then the class list order.
  const rank = (s: Student) => (s.status === "locked" ? 0 : s.flagged ? 1 : 2);
  const rows = students.filter(active.test).toSorted((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "uk"));

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 pt-5 pb-6">
          <p className="font-semibold text-sidebar-accent-foreground">Liceum Mastery</p>
          <p className="text-sm text-muted-foreground">Ліцей №1 (демо)</p>
        </div>
        <nav aria-label="Розділи" className="flex flex-col gap-0.5 px-3">
          {NAV.map(({ label, icon: Icon, current }) => (
            <a
              key={label}
              href="#"
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/60",
                current && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4 text-sm">
          <p className="font-medium text-sidebar-accent-foreground">Олена Петрівна Коваль</p>
          <p className="text-muted-foreground">Учителька історії</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              <a href="#" className="underline-offset-4 hover:underline">
                Тести
              </a>{" "}
              / Історія України
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Козацька доба · 9-А</h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {TOTAL} питань · ліміт 30 хв · відкрито о 10:05
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-right text-sm text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">Відкрито 18 хв</span>
              <br />
              оновлено о 10:23:41
            </p>
            <Button variant="outline">Закрити тест</Button>
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

        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-10 text-right">№</TableHead>
                <TableHead>Учень</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Бланк</TableHead>
                <TableHead className="text-right">Час</TableHead>
                <TableHead>Події</TableHead>
                <TableHead>
                  <span className="sr-only">Дія</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(s => {
                const count = s.answered.filter(Boolean).length;
                const lastEvent = s.events.at(-1);
                return (
                  <TableRow key={s.id} className={cn(s.status === "locked" && "bg-danger-soft hover:bg-danger-soft")}>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{s.id}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-sm border-transparent font-medium", STATUS[s.status].className)}>
                        {STATUS[s.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <SheetStrip answered={s.answered} />
                        <span className="w-10 text-right tabular-nums">
                          {count}
                          <span className="text-muted-foreground">/{TOTAL}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.status === "done" ? (
                        <span className="text-muted-foreground">здав о {s.time}</span>
                      ) : s.status === "idle" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        s.time
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {s.flagged && (
                          <span title="Можливе списування" className="text-warning-foreground">
                            <TriangleAlert className="size-4" role="img" aria-label="Можливе списування" />
                          </span>
                        )}
                        {lastEvent && (
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {lastEvent.label} · {lastEvent.at}
                            {s.events.length > 1 && ` (+${s.events.length - 1})`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === "locked" && (
                        <Button size="sm" onClick={() => unlock(s.id)}>
                          <LockOpen aria-hidden />
                          Дозволити продовжити
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">У цьому фільтрі зараз нікого немає.</p>
          )}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <TriangleAlert className="size-4 text-warning-foreground" aria-hidden />
          Можливе списування: під час тесту була подія. Демо-дані, таблиця оновлюється кожні 5 секунд.
        </p>
      </main>
    </div>
  );
}
