// The report as CSV for Excel: UTF-8 with a BOM so Cyrillic shows, `;` and decimal commas as the Ukrainian locale expects.
import { requireStaff } from "@/lib/auth";
import { buildReport, getAssignment, pts } from "@/lib/staff";

const cell = (v: string | number | null) => {
  const s = v === null ? "" : typeof v === "number" ? pts(v) : v;
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export async function GET(_: Request, { params }: RouteContext<"/dashboard/assignments/[id]/csv">) {
  const me = await requireStaff();
  const a = await getAssignment(Number((await params).id), me);
  if (!a) return new Response(null, { status: 404 });
  const { questions, lines, correct, max } = await buildReport(a);

  const table = [
    ["№", "Учень", ...questions.map((_, i) => String(i + 1)), "Бал", `Макс. (${pts(max)})`, "Оцінка", "Можливе списування", "Повторна спроба", "Коментар вчителя"],
    ...lines.map(l => [
      l.n,
      l.student.name,
      ...l.cells,
      l.score ?? l.state,
      l.attempt?.maxScore ?? null,
      l.grade,
      l.attempt?.flagged ? "так" : "",
      l.tries > 1 ? "так" : "",
      l.attempt?.comment ?? "",
    ]),
    ["", "% правильних", ...correct.map(c => (c === null ? "" : `${c}%`))],
  ];
  const csv = "﻿" + table.map(r => r.map(cell).join(";")).join("\r\n");
  const name = `${a.title} ${a.className}`.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
    },
  });
}
