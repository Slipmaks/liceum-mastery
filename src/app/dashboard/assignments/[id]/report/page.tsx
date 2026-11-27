// Report: students × questions (PRODUCT.md › Teacher views). Exports to CSV next door.
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, TriangleAlert } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { buildReport, getAssignment, pts } from "@/lib/staff";
import { dayTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Звіт" };

export default function ReportPage({ params }: PageProps<"/dashboard/assignments/[id]/report">) {
  return (
    <Suspense>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: Pick<PageProps<"/dashboard/assignments/[id]/report">, "params">) {
  const me = await requireStaff();
  const a = await getAssignment(Number((await params).id), me);
  if (!a) notFound();
  const { questions, lines, correct, max } = await buildReport(a);
  const done = lines.filter(l => l.score !== null).length;

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">
              Тести
            </Link>{" "}
            / {a.subject}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {a.title} · {a.className}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {a.closedAt ? `закрито ${dayTime(a.closedAt)}` : "тест ще відкритий"} · здали {done} з {lines.length} · максимум {pts(max)} б.
          </p>
        </div>
        <div className="flex gap-2">
          {!a.closedAt && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/assignments/${a.id}`}>Моніторинг</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={`/dashboard/assignments/${a.id}/csv`} download>
              <Download aria-hidden /> CSV
            </a>
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-10 text-right">№</TableHead>
              <TableHead>Учень</TableHead>
              {questions.map((q, i) => (
                <TableHead key={q.id} className="text-right tabular-nums" title={q.prompt}>
                  {i + 1}
                </TableHead>
              ))}
              <TableHead className="text-right">Бал</TableHead>
              <TableHead className="text-right">Оцінка</TableHead>
              <TableHead>
                <span className="sr-only">Позначки</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(l => (
              <TableRow key={l.student.id}>
                <TableCell className="text-right text-muted-foreground tabular-nums">{l.n}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {l.attempt ? (
                    <Link href={`/dashboard/attempts/${l.attempt.id}`} className="underline-offset-4 hover:underline">
                      {l.student.name}
                    </Link>
                  ) : (
                    l.student.name
                  )}
                  {l.tries > 1 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">повторна</span>}
                </TableCell>
                {l.cells.map((c, i) => (
                  <TableCell key={questions[i].id} className={c ? "text-right tabular-nums" : "text-right text-muted-foreground tabular-nums"}>
                    {c === null ? "" : pts(c)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium tabular-nums">{l.score === null ? <span className="font-normal text-muted-foreground">{l.state}</span> : pts(l.score)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{l.grade ?? ""}</TableCell>
                <TableCell>
                  {l.attempt?.flagged && (
                    <span title="Можливе списування" className="text-warning-foreground">
                      <TriangleAlert className="size-4" role="img" aria-label="Можливе списування" />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell />
              <TableCell className="text-muted-foreground">% правильних</TableCell>
              {correct.map((c, i) => (
                <TableCell key={questions[i].id} className="text-right tabular-nums">
                  {c === null ? "" : `${c}%`}
                </TableCell>
              ))}
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <TriangleAlert className="size-4 text-warning-foreground" aria-hidden />
        Можливе списування: під час тесту була подія. Відкрийте учня, щоб побачити журнал і відповіді. Рахується остання спроба.
      </p>
    </div>
  );
}
