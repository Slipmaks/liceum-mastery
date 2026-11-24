"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Clock, LayoutGrid, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetStrip } from "@/components/sheet-strip";
import { cn } from "@/lib/utils";
import { QUESTIONS, TEST, type Question } from "./questions";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
// Only what the prompt itself does not say: how to mark the answer.
const HINT: Partial<Record<Question["type"], string>> = {
  many: "Можна позначити кілька варіантів.",
  match: "Позначте одну літеру в кожному рядку.",
  order: "Від першої події до останньої.",
};

type Answer = number[] | Record<number, number>;

// Demo state: a student mid-test, questions 1–3 answered and 4 started.
const START: Record<number, Answer> = { 0: [2], 1: [1], 2: [1, 3], 3: { 0: 3, 1: 2 } };

export function TestScreen() {
  const [q, setQ] = useState(3);
  const [answers, setAnswers] = useState<Record<number, Answer>>(START);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [left, setLeft] = useState(1421);
  const [view, setView] = useState<"test" | "locked" | "done">("test");

  // Prototype knobs: ?q=5&left=240&state=locked
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (p.get("q")) setQ(Math.min(QUESTIONS.length, Math.max(1, Number(p.get("q")))) - 1);
    if (p.get("left")) setLeft(Number(p.get("left")));
    if (p.get("state") === "locked" || p.get("state") === "done") setView(p.get("state") as "locked" | "done");
    if (p.get("sheet")) setSheetOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (view === "done") return;
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [view]);

  const answered = QUESTIONS.map((_, i) => i in answers);
  const question = QUESTIONS[q];
  const last = q === QUESTIONS.length - 1;
  const set = (a: Answer) => setAnswers(prev => ({ ...prev, [q]: a }));
  const go = (i: number) => {
    setQ(i);
    setSheetOpen(false);
  };

  if (view === "done") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold text-balance">Вітаю! Ви завершили тест</h1>
        <p className="text-muted-foreground">Відповіді збережено. Сторінку можна закрити.</p>
      </Centered>
    );
  }

  if (view === "locked") {
    return (
      <Centered>
        <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-destructive">
          <Lock className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">Тест призупинено</h1>
        <p className="max-w-xs text-pretty text-muted-foreground">
          Ви вийшли зі сторінки тесту. Зверніться до вчителя, щоб він дозволив продовжити.
        </p>
        <Timer seconds={left} />
        <p className="text-sm text-muted-foreground">Час тесту не зупиняється.</p>
      </Centered>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-xl flex-col select-none">
      <header className="border-b px-4 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold tabular-nums">
              Питання {q + 1} з {QUESTIONS.length}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {TEST.subject} · {TEST.title}
            </p>
          </div>
          <Timer seconds={left} />
        </div>
        <SheetStrip answered={answered} current={q} numbered className="mt-3 gap-1" cellClassName="h-7 w-auto flex-1" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
        <h1 className="text-lg leading-relaxed font-medium text-pretty">{question.prompt}</h1>
        {HINT[question.type] && <p className="mt-1 text-sm text-muted-foreground">{HINT[question.type]}</p>}
        <div className="mt-5">
          {question.type === "one" || question.type === "many" ? (
            <Choices key={q} q={q} question={question} value={(answers[q] as number[]) ?? []} onChange={set} />
          ) : question.type === "match" ? (
            <Match key={q} q={q} question={question} value={(answers[q] as Record<number, number>) ?? {}} onChange={set} />
          ) : question.type === "order" ? (
            <Order key={q} touched={q in answers} question={question} value={(answers[q] as number[]) ?? question.items.map((_, i) => i)} onChange={set} />
          ) : null}
        </div>
      </main>

      <footer className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {sheetOpen && (
          <div id="sheet" className="border-b px-4 py-4">
            <p className="text-sm font-medium">Бланк відповідей</p>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === q ? "step" : undefined}
                  aria-label={`Питання ${i + 1}${answered[i] ? ", є відповідь" : ", без відповіді"}`}
                  className={cn(
                    "h-12 rounded-md border text-base font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    answered[i] ? "border-primary bg-primary text-primary-foreground" : "border-input bg-sheet",
                    i === q && "outline-2 outline-offset-2 outline-primary",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                Без відповіді: {answered.filter(a => !a).length}
              </p>
              <Button variant="outline" className="h-11 px-4" onClick={() => setView("done")}>
                Завершити тест
              </Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-3">
          <Button variant="outline" className="h-12 text-base" disabled={q === 0} onClick={() => go(q - 1)}>
            <ArrowLeft aria-hidden /> Назад
          </Button>
          <Button
            variant="secondary"
            className="h-12 px-4 text-base tabular-nums"
            aria-expanded={sheetOpen}
            aria-controls="sheet"
            onClick={() => setSheetOpen(o => !o)}
          >
            <LayoutGrid aria-hidden /> Бланк
            <span className="text-muted-foreground">
              {answered.filter(Boolean).length}/{QUESTIONS.length}
            </span>
          </Button>
          {last ? (
            <Button className="h-12 text-base" onClick={() => setView("done")}>
              Завершити
            </Button>
          ) : (
            <Button className="h-12 text-base" onClick={() => go(q + 1)}>
              Далі <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">{children}</main>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div
      role="timer"
      aria-label={`Залишилось ${Math.floor(seconds / 60)} хв ${seconds % 60} с`}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-base font-semibold tabular-nums",
        seconds < 60
          ? "bg-danger-soft text-destructive"
          : seconds < 300
            ? "bg-warning-soft text-warning-foreground"
            : "bg-muted text-foreground",
      )}
    >
      <Clock className="size-4" aria-hidden />
      {mm}:{ss}
    </div>
  );
}

const mark =
  "grid shrink-0 place-items-center rounded-[4px] border border-input bg-sheet font-semibold tabular-nums";
const inked = "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground";

function Choices({
  q,
  question,
  value,
  onChange,
}: {
  q: number;
  question: { type: "one" | "many"; options: string[] };
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const many = question.type === "many";
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Варіанти відповіді</legend>
      {question.options.map((text, i) => (
        <label
          key={i}
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type={many ? "checkbox" : "radio"}
            name={`q${q}`}
            className="peer sr-only"
            checked={value.includes(i)}
            onChange={() => onChange(many ? (value.includes(i) ? value.filter(v => v !== i) : [...value, i]) : [i])}
          />
          <span className={cn(mark, inked, "size-8 text-sm")}>{LETTERS[i]}</span>
          <span className="text-base leading-snug">{text}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Match({
  q,
  question,
  value,
  onChange,
}: {
  q: number;
  question: { left: string[]; right: string[] };
  value: Record<number, number>;
  onChange: (v: Record<number, number>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-x-4 gap-y-3 text-base sm:grid-cols-2">
        <ol className="flex flex-col gap-2">
          {question.left.map((t, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold tabular-nums">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <ul className="flex flex-col gap-2 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          {question.right.map((t, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold">{LETTERS[i]}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <table className="w-fit border-collapse">
        <caption className="sr-only">Бланк відповідності</caption>
        <thead>
          <tr>
            <td />
            {question.right.map((_, j) => (
              <th key={j} scope="col" className="pb-1.5 text-sm font-semibold">
                {LETTERS[j]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.left.map((_, i) => (
            <tr key={i}>
              <th scope="row" className="pr-2 text-sm font-semibold tabular-nums">
                {i + 1}
              </th>
              {question.right.map((_, j) => (
                <td key={j} className="border border-input p-0">
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`m${q}-${i}`}
                      className="peer sr-only"
                      aria-label={`${i + 1} — ${LETTERS[j]}`}
                      checked={value[i] === j}
                      onChange={() => onChange({ ...value, [i]: j })}
                    />
                    {/* The NMT mark: an ink cross inside the printed cell. */}
                    <span className="grid size-12 place-items-center bg-sheet text-primary peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-inset peer-checked:[&>svg]:block">
                      <X className="hidden size-7" strokeWidth={2.75} aria-hidden />
                    </span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Order({
  touched,
  question,
  value,
  onChange,
}: {
  touched: boolean;
  question: { items: string[] };
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const move = (from: number, to: number) => {
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-2">
      {value.map((item, pos) => (
        <li key={item} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card py-1.5 pr-1.5 pl-3">
          <span className={cn(mark, "size-8 text-sm", touched && "border-primary bg-primary text-primary-foreground")}>
            {pos + 1}
          </span>
          <span className="flex-1 text-base leading-snug">{question.items[item]}</span>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11"
            disabled={pos === 0}
            aria-label={`«${question.items[item]}» вище`}
            onClick={() => move(pos, pos - 1)}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11"
            disabled={pos === value.length - 1}
            aria-label={`«${question.items[item]}» нижче`}
            onClick={() => move(pos, pos + 1)}
          >
            <ArrowDown aria-hidden />
          </Button>
        </li>
      ))}
    </ol>
  );
}
