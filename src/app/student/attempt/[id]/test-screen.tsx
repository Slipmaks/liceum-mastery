"use client";
// The test screen: PRODUCT.md › Taking a test, Anti-cheat; visual rules in DESIGN.md.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Clock, LayoutGrid, Lock, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetStrip } from "@/components/sheet-strip";
import { cn } from "@/lib/utils";
import type { AnswerResponse, StudentQuestion } from "@/lib/questions";
import type { AttemptState } from "@/lib/attempt";
import { openAttempt, pollAttempt, saveAnswer, submitAttempt } from "../../actions";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Є", "Ж"];
// Only what the prompt itself does not say: how to mark the answer.
const HINT: Partial<Record<StudentQuestion["type"], string>> = {
  many: "Можна позначити кілька варіантів.",
  match: "Позначте одну літеру в кожному рядку.",
  order: "Розташуйте кнопками ↑ і ↓.",
};

// Fullscreen is asked for on desktop only; iPhone Safari has no Fullscreen API (PRODUCT.md › Anti-cheat).
const onFullscreenChange = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const needsFullscreen = () => document.fullscreenEnabled && matchMedia("(pointer: fine)").matches && !document.fullscreenElement;

type Props = {
  attemptId: number;
  subject: string;
  title: string;
  questions: StudentQuestion[];
  initialAnswers: Record<number, AnswerResponse>;
  initial: AttemptState;
};

export function TestScreen({ attemptId, subject, title, questions, initialAnswers, initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locked, setLocked] = useState(initial.status === "locked");
  const [unsaved, setUnsaved] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);
  const wantsFullscreen = useSyncExternalStore(onFullscreenChange, needsFullscreen, () => false) && !fullscreenFailed;
  const left = useCountdown(initial.remainingMs, () => router.refresh());
  const pending = useRef(new Map<number, AnswerResponse | null>());

  const apply = useCallback(
    (s: AttemptState) => {
      if (s.status === "finished") router.refresh();
      else setLocked(s.status === "locked");
    },
    [router],
  );

  // First open is free; opening again (reload, another tab) locks. A ref, so React's dev double-effect calls it once.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    openAttempt(attemptId).then(apply);
  }, [attemptId, apply]);

  // Anti-cheat: every event goes to the server; the ones that lock also lock the screen at once.
  useEffect(() => {
    const send = (type: string) => navigator.sendBeacon(`/student/attempt/${attemptId}/event`, type);
    const lock = (type: string) => {
      send(type);
      setLocked(true);
    };
    let wasFullscreen = !!document.fullscreenElement;
    const onVisibility = () => document.visibilityState === "hidden" && lock("hidden");
    const onPagehide = () => send("pagehide");
    const onBlur = () => send("blur");
    const onFullscreen = () => {
      if (wasFullscreen && !document.fullscreenElement) lock("fullscreen_exit");
      wasFullscreen = !!document.fullscreenElement;
    };
    const block = (e: Event) => {
      e.preventDefault();
      send(e.type);
    };
    const blocked = ["copy", "cut", "paste", "contextmenu"];
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("pagehide", onPagehide);
    window.addEventListener("blur", onBlur);
    blocked.forEach(t => document.addEventListener(t, block));
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("pagehide", onPagehide);
      window.removeEventListener("blur", onBlur);
      blocked.forEach(t => document.removeEventListener(t, block));
    };
  }, [attemptId]);

  // While locked, wait for the teacher's «Дозволити продовжити» (the monitor polls every 5 s too).
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => pollAttempt(attemptId).then(apply), 5000);
    return () => clearInterval(id);
  }, [locked, attemptId, apply]);

  // Every answer goes to the server at once; failed saves are retried until they land.
  const flush = useCallback(async () => {
    for (const [qid, r] of pending.current) {
      try {
        const s = await saveAnswer(attemptId, qid, r);
        if (pending.current.get(qid) === r) pending.current.delete(qid);
        apply(s);
      } catch {
        setUnsaved(true);
        return;
      }
    }
    setUnsaved(false);
  }, [attemptId, apply]);
  useEffect(() => {
    if (!unsaved) return;
    const id = setInterval(flush, 5000);
    return () => clearInterval(id);
  }, [unsaved, flush]);

  const question = questions[q];
  const answered = questions.map(x => x.id in answers);
  const last = q === questions.length - 1;
  const set = (r: AnswerResponse | null) => {
    const qid = question.id;
    setAnswers(prev => {
      const next = { ...prev };
      if (r === null) delete next[qid];
      else next[qid] = r;
      return next;
    });
    pending.current.set(qid, r);
    flush();
  };
  const go = (i: number) => {
    setQ(i);
    setSheetOpen(false);
  };

  if (locked) {
    return (
      <Centered>
        <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-destructive">
          <Lock className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">Тест призупинено</h1>
        <p className="max-w-xs text-pretty text-muted-foreground">Зверніться до вчителя, щоб він дозволив продовжити.</p>
        <Timer seconds={left} />
        <p className="text-sm text-muted-foreground">Час тесту не зупиняється.</p>
      </Centered>
    );
  }

  if (wantsFullscreen) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <p className="max-w-sm text-pretty text-muted-foreground">
          Тест відкриється на весь екран. Не виходьте з повноекранного режиму й не перемикайте вкладки: тест буде призупинено.
        </p>
        <Button
          className="mt-2 h-12 px-6 text-base"
          onClick={() => document.documentElement.requestFullscreen().catch(() => setFullscreenFailed(true))}
        >
          <Maximize aria-hidden /> {Object.keys(answers).length ? "Продовжити" : "Розпочати"}
        </Button>
        <Timer seconds={left} />
      </Centered>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-xl flex-col select-none">
      <header className="border-b px-4 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold tabular-nums">
              Питання {q + 1} з {questions.length}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {subject} · {title}
            </p>
          </div>
          <Timer seconds={left} />
        </div>
        <SheetStrip answered={answered} current={q} numbered className="mt-3 gap-1" cellClassName="h-7 w-auto flex-1" />
        {unsaved && (
          <p role="alert" className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
            Немає зв’язку. Відповідь збережеться, щойно з’єднання відновиться.
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
        <h1 className="text-lg leading-relaxed font-medium text-pretty">{question.prompt}</h1>
        {HINT[question.type] && <p className="mt-1 text-sm text-muted-foreground">{HINT[question.type]}</p>}
        <div className="mt-5">
          {question.kind === "choice" ? (
            <Choices key={question.id} question={question} value={(answers[question.id] as string[]) ?? []} onChange={set} />
          ) : question.kind === "match" ? (
            <Match key={question.id} question={question} value={(answers[question.id] as Record<string, string>) ?? {}} onChange={set} />
          ) : (
            <Order
              key={question.id}
              touched={question.id in answers}
              question={question}
              value={(answers[question.id] as string[]) ?? question.items.map(i => i.id)}
              onChange={set}
            />
          )}
        </div>
      </main>

      <footer className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {sheetOpen && (
          <div id="sheet" className="border-b px-4 py-4">
            <p className="text-sm font-medium">Бланк відповідей</p>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {questions.map((_, i) => (
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
            <form action={submitAttempt.bind(null, attemptId)} className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">Без відповіді: {answered.filter(a => !a).length}</p>
              <Button type="submit" variant="outline" className="h-11 px-4" disabled={unsaved}>
                Завершити тест
              </Button>
            </form>
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
              {answered.filter(Boolean).length}/{questions.length}
            </span>
          </Button>
          {last ? (
            // Opens the answer sheet: submitting is a second, deliberate step there.
            <Button className="h-12 text-base" onClick={() => setSheetOpen(true)}>
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

/** Seconds left, counted from the server's remaining time (not the device clock). Calls onExpire every second at zero. */
function useCountdown(remainingMs: number, onExpire: () => void) {
  const [end] = useState(() => Date.now() + remainingMs);
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= end) expire.current();
    }, 1000);
    return () => clearInterval(id);
  }, [end]);
  return Math.max(0, Math.ceil((end - now) / 1000));
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center select-none">{children}</main>;
}

function Timer({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div
      role="timer"
      aria-label={`Залишилось ${Math.floor(seconds / 60)} хв ${seconds % 60} с`}
      suppressHydrationWarning
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-base font-semibold tabular-nums",
        seconds < 60 ? "bg-danger-soft text-destructive" : seconds < 300 ? "bg-warning-soft text-warning-foreground" : "bg-muted text-foreground",
      )}
    >
      <Clock className="size-4" aria-hidden />
      <span suppressHydrationWarning>
        {mm}:{ss}
      </span>
    </div>
  );
}

const mark = "grid shrink-0 place-items-center rounded-[4px] border border-input bg-sheet font-semibold tabular-nums";
const inked = "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground";

function Choices({
  question,
  value,
  onChange,
}: {
  question: Extract<StudentQuestion, { kind: "choice" }>;
  value: string[];
  onChange: (v: string[] | null) => void;
}) {
  const many = question.type === "many";
  const toggle = (id: string) => {
    const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id];
    onChange(next.length ? next : null);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Варіанти відповіді</legend>
      {question.options.map((o, i) => (
        <label
          key={o.id}
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type={many ? "checkbox" : "radio"}
            name={`q${question.id}`}
            className="peer sr-only"
            checked={value.includes(o.id)}
            onChange={() => (many ? toggle(o.id) : onChange([o.id]))}
          />
          <span className={cn(mark, inked, "size-8 text-sm")}>{LETTERS[i]}</span>
          <span className="text-base leading-snug">{o.text}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Match({
  question,
  value,
  onChange,
}: {
  question: Extract<StudentQuestion, { kind: "match" }>;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-x-4 gap-y-3 text-base sm:grid-cols-2">
        <ol className="flex flex-col gap-2">
          {question.left.map((l, i) => (
            <li key={l.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold tabular-nums">{i + 1}</span>
              {l.text}
            </li>
          ))}
        </ol>
        <ul className="flex flex-col gap-2 border-t pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          {question.right.map((r, j) => (
            <li key={r.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold">{LETTERS[j]}</span>
              {r.text}
            </li>
          ))}
        </ul>
      </div>

      <table className="w-fit border-collapse">
        <caption className="sr-only">Бланк відповідності</caption>
        <thead>
          <tr>
            <td />
            {question.right.map((r, j) => (
              <th key={r.id} scope="col" className="pb-1.5 text-sm font-semibold">
                {LETTERS[j]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.left.map((l, i) => (
            <tr key={l.id}>
              <th scope="row" className="pr-2 text-sm font-semibold tabular-nums">
                {i + 1}
              </th>
              {question.right.map((r, j) => (
                <td key={r.id} className="border border-input p-0">
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name={`m${question.id}-${l.id}`}
                      className="peer sr-only"
                      aria-label={`${i + 1} — ${LETTERS[j]}`}
                      checked={value[l.id] === r.id}
                      onChange={() => onChange({ ...value, [l.id]: r.id })}
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
  question: Extract<StudentQuestion, { kind: "order" }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text = new Map(question.items.map(i => [i.id, i.text]));
  const move = (from: number, to: number) => {
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-2">
      {value.map((id, pos) => (
        <li key={id} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card py-1.5 pr-1.5 pl-3">
          <span className={cn(mark, "size-8 text-sm", touched && "border-primary bg-primary text-primary-foreground")}>{pos + 1}</span>
          <span className="flex-1 text-base leading-snug">{text.get(id)}</span>
          <Button variant="ghost" size="icon-lg" className="size-11" disabled={pos === 0} aria-label={`«${text.get(id)}» вище`} onClick={() => move(pos, pos - 1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11"
            disabled={pos === value.length - 1}
            aria-label={`«${text.get(id)}» нижче`}
            onClick={() => move(pos, pos + 1)}
          >
            <ArrowDown aria-hidden />
          </Button>
        </li>
      ))}
    </ol>
  );
}

/** On the «Вітаю» screen: the test is over, give the student their screen back. */
export function LeaveFullscreen() {
  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  return null;
}
