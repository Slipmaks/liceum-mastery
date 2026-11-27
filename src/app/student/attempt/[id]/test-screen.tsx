"use client";
// The test screen: PRODUCT.md › Taking a test, Anti-cheat; visual rules in DESIGN.md.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Clock, LayoutGrid, Lock, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetStrip, type CellState } from "@/components/sheet-strip";
import { cn } from "@/lib/utils";
import type { AnswerResponse, StudentQuestion } from "@/lib/questions";
import type { AttemptState } from "@/lib/attempt";
import { openAttempt, pollAttempt, saveAnswer, submitAttempt } from "../../actions";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Є", "Ж"];
// No motion or press displacement on the exam screen (DESIGN.md › Don't).
const EXAM_BTN = "transition-none active:translate-y-0";
// Only what the prompt itself does not say: how to mark the answer.
const HINT: Partial<Record<StudentQuestion["type"], string>> = {
  many: "Можна позначити кілька варіантів.",
  match: "Позначте одну літеру в кожному рядку. Повторне натискання знімає позначку.",
  order: "Розташуйте кнопками ↑ і ↓ або підтвердьте поточний порядок.",
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
  /** «Переглянути як учень» for staff: nothing is sent to the server, no anti-cheat, no fullscreen, no submit. */
  preview?: boolean;
  backHref?: string;
};

export function TestScreen({ attemptId, subject, title, questions, initialAnswers, initial, preview = false, backHref }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [locked, setLocked] = useState(initial.status === "locked");
  const [unlockedNotice, setUnlockedNotice] = useState(false);
  const [orderNotice, setOrderNotice] = useState(false);
  const [pollOffline, setPollOffline] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const wantsFullscreen = useSyncExternalStore(onFullscreenChange, needsFullscreen, () => false) && !fullscreenFailed && !preview;
  const left = useCountdown(initial.remainingMs, () => !preview && router.refresh());
  const pending = useRef(new Map<number, AnswerResponse | null>());
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetToggleRef = useRef<HTMLButtonElement | null>(null);
  const currentSheetBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasSheetOpen = useRef(false);

  const apply = useCallback(
    (s: AttemptState) => {
      setPollOffline(false);
      if (s.status === "finished") router.refresh();
      else {
        setLocked(prev => {
          if (prev && s.status !== "locked") setUnlockedNotice(true);
          else if (s.status === "locked") setUnlockedNotice(false);
          return s.status === "locked";
        });
      }
    },
    [router],
  );

  // First open is free; opening again (reload, another tab) locks. A ref, so React's dev double-effect calls it once.
  const opened = useRef(false);
  useEffect(() => {
    if (preview || opened.current) return;
    opened.current = true;
    openAttempt(attemptId).then(apply);
  }, [attemptId, apply, preview]);

  // Anti-cheat: every event goes to the server; the ones that lock also lock the screen at once.
  useEffect(() => {
    if (preview) return;
    const send = (type: string) => navigator.sendBeacon(`/student/attempt/${attemptId}/event`, type);
    const lock = (type: string) => {
      send(type);
      setUnlockedNotice(false);
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
  }, [attemptId, preview]);

  // While locked, wait for the teacher's «Дозволити продовжити» (the monitor polls every 5 s too).
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => pollAttempt(attemptId).then(apply, () => setPollOffline(true)), 5000);
    return () => clearInterval(id);
  }, [locked, attemptId, apply]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setConfirmSubmit(false);
    requestAnimationFrame(() => sheetToggleRef.current?.focus());
  }, []);

  // Focus entry, focus trap, and Escape dismiss for the «Бланк» sheet dialog.
  useEffect(() => {
    if (!sheetOpen) {
      wasSheetOpen.current = false;
      return;
    }
    if (!wasSheetOpen.current) {
      requestAnimationFrame(() => currentSheetBtnRef.current?.focus());
    }
    wasSheetOpen.current = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || !sheetRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !sheetRef.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  // Every answer goes to the server at once; failed saves are retried until they land.
  const flush = useCallback(async () => {
    if (preview) return pending.current.clear();
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
  }, [attemptId, apply, preview]);
  useEffect(() => {
    if (!unsaved) return;
    const id = setInterval(flush, 5000);
    return () => clearInterval(id);
  }, [unsaved, flush]);

  const question = questions[q];
  const states: CellState[] = questions.map(x => {
    const r = answers[x.id];
    if (r === undefined) return "empty";
    if (x.kind === "match") {
      const count = Object.keys(r as Record<string, string>).length;
      if (count === 0) return "empty";
      return count >= x.left.length ? "done" : "partial";
    }
    return "done";
  });
  const doneCount = states.filter(s => s === "done").length;
  const partialCount = states.filter(s => s === "partial").length;
  const emptyCount = states.filter(s => s === "empty").length;
  const incompleteCount = emptyCount + partialCount;
  const last = q === questions.length - 1;

  const timerBand = left < 60 ? "critical" : left < 300 ? "warning" : "normal";
  const liveStatus = locked
    ? "Тест призупинено. Усі попередні відповіді збережено. Зверніться до вчителя."
    : timerBand === "critical"
      ? "Залишилось менше однієї хвилини."
      : timerBand === "warning"
        ? "Залишилось менше 5 хвилин."
        : unlockedNotice
          ? "Вчитель дозволив продовжити тест."
          : orderNotice
            ? "Порядок зафіксовано."
            : "";

  const set = (r: AnswerResponse | null) => {
    const qid = question.id;
    setUnlockedNotice(false);
    if (question.kind === "order") setOrderNotice(true);
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
    setOrderNotice(false);
    setSheetOpen(false);
    setConfirmSubmit(false);
  };

  if (locked) {
    return (
      <Centered>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </p>
        <div role="alert" className="grid justify-items-center gap-3">
          <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-destructive">
            <Lock className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold">Тест призупинено</h1>
          <p className="max-w-xs text-pretty text-muted-foreground">Зверніться до вчителя, щоб він дозволив продовжити.</p>
        </div>
        <Timer seconds={left} />
        <p className="text-sm text-muted-foreground">Час тесту не зупиняється.</p>
        <p className="mt-2 max-w-sm rounded-lg border bg-card px-4 py-3 text-sm text-pretty text-foreground">
          Усі попередні відповіді збережено. Не оновлюйте сторінку — тест відкриється сам після дозволу вчителя.
        </p>
        <p className="text-xs text-muted-foreground" role={pollOffline ? "status" : undefined}>
          {pollOffline ? "Немає зв’язку — перевірю, щойно мережа відновиться." : "Перевіряємо дозвіл кожні 5 с."}
        </p>
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
          className={cn("mt-2 h-12 px-6 text-base", EXAM_BTN)}
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
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveStatus}
      </p>
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
        <SheetStrip states={states} current={q} numbered onSelect={go} className="mt-3 gap-1" cellClassName="h-7 min-w-6 flex-1" />
        {preview && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
            <span>Попередній перегляд: відповіді не зберігаються.</span>
            {backHref && (
              <Link href={backHref} className="shrink-0 font-medium underline-offset-4 hover:underline">
                До тесту
              </Link>
            )}
          </div>
        )}
        {left === 0 && !preview && (
          <p role="status" className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
            Час вийшов — завершуємо тест…
          </p>
        )}
        {unsaved && (
          <p role="alert" className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
            Немає зв’язку. Відповідь збережеться, щойно з’єднання відновиться.
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-8">
        <h1 className="text-lg leading-relaxed font-medium text-pretty">{question.prompt}</h1>
        {HINT[question.type] && <p className="mt-1 text-sm text-muted-foreground">{HINT[question.type]}</p>}
        <div className="mt-4">
          {question.kind === "choice" ? (
            <Choices key={question.id} question={question} value={(answers[question.id] as string[]) ?? []} onChange={set} />
          ) : question.kind === "match" ? (
            <Match key={question.id} question={question} value={(answers[question.id] as Record<string, string>) ?? {}} onChange={set} />
          ) : (
            <Order
              key={question.id}
              touched={question.id in answers}
              savedNotice={orderNotice}
              question={question}
              value={(answers[question.id] as string[]) ?? question.items.map(i => i.id)}
              onChange={set}
            />
          )}
        </div>
      </main>

      <footer className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {sheetOpen && (
          <div id="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="flex max-h-[55dvh] flex-col border-b">
            <div className="overflow-y-auto px-4 pt-3 pb-3">
              <div className="flex items-center justify-between gap-2">
                <p id="sheet-title" className="text-sm font-medium">
                  Бланк відповідей
                </p>
                <Button type="button" variant="ghost" size="icon" className={cn("size-10", EXAM_BTN)} aria-label="Закрити бланк" onClick={closeSheet}>
                  <X aria-hidden />
                </Button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-[2px] border border-primary bg-primary" aria-hidden />Є відповідь
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative size-3 rounded-[2px] border border-primary bg-accent after:absolute after:right-0.5 after:bottom-0.5 after:size-1 after:rounded-full after:bg-primary" aria-hidden />
                  Частково
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-[2px] border border-input bg-sheet" aria-hidden />
                  Порожньо
                </span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    ref={i === q ? currentSheetBtnRef : undefined}
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === q ? "step" : undefined}
                    aria-label={`Питання ${i + 1}${states[i] === "done" ? ", є відповідь" : states[i] === "partial" ? ", відповідь часткова" : ", без відповіді"}`}
                    className={cn(
                      "relative h-12 rounded-md border text-base font-semibold tabular-nums",
                      states[i] === "done"
                        ? "border-primary bg-primary text-primary-foreground"
                        : states[i] === "partial"
                          ? "border-primary bg-accent text-accent-foreground after:pointer-events-none after:absolute after:right-1 after:bottom-1 after:size-1.5 after:rounded-full after:bg-primary"
                          : "border-input bg-sheet",
                      i === q ? "outline-2 outline-offset-2 outline-primary" : "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t px-4 py-3">
              {confirmSubmit ? (
                <div className="grid gap-3">
                  <p className="text-sm text-pretty">
                    {incompleteCount > 0 ? (
                      <>
                        Без повної відповіді: <span className="font-semibold tabular-nums">{incompleteCount}</span>. Після завершення змінити відповіді не можна.
                      </>
                    ) : (
                      "Усі питання мають відповіді. Після завершення змінити відповіді не можна."
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("h-12 text-base", EXAM_BTN)}
                      disabled={submitting}
                      onClick={() => setConfirmSubmit(false)}
                    >
                      Повернутися
                    </Button>
                    <Button
                      type="button"
                      className={cn("h-12 text-base", EXAM_BTN)}
                      disabled={unsaved || preview || submitting}
                      onClick={() => startSubmit(() => submitAttempt(attemptId))}
                    >
                      {submitting ? "Надсилаю…" : "Завершити тест"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground tabular-nums">
                      Без відповіді: {emptyCount}
                      {partialCount > 0 && ` · частково: ${partialCount}`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("h-12 px-5 text-base", EXAM_BTN)}
                      disabled={unsaved || preview || submitting}
                      onClick={() => setConfirmSubmit(true)}
                    >
                      {submitting ? "Надсилаю…" : "Завершити тест"}
                    </Button>
                  </div>
                  {(preview || unsaved) && (
                    <p className="text-xs text-muted-foreground">
                      {preview ? "У режимі перегляду тест не надсилається." : "Дочекайтеся збереження відповідей перед завершенням."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-3">
          <Button variant="outline" className={cn("h-12 text-base", EXAM_BTN)} disabled={q === 0} onClick={() => go(q - 1)}>
            <ArrowLeft aria-hidden /> Назад
          </Button>
          <Button
            ref={sheetToggleRef}
            variant="secondary"
            className={cn("h-12 px-4 text-base tabular-nums", EXAM_BTN)}
            aria-expanded={sheetOpen}
            aria-controls="sheet"
            onClick={() => {
              setConfirmSubmit(false);
              setSheetOpen(o => !o);
            }}
          >
            <LayoutGrid aria-hidden /> Бланк
            <span className="text-muted-foreground">
              {doneCount}/{questions.length}
            </span>
          </Button>
          {last ? (
            // Opens the answer sheet: submitting is a second, deliberate step there.
            <Button
              className={cn("h-12 text-base", EXAM_BTN)}
              onClick={() => {
                setConfirmSubmit(false);
                setSheetOpen(true);
              }}
            >
              Завершити
            </Button>
          ) : (
            <Button className={cn("h-12 text-base", EXAM_BTN)} onClick={() => go(q + 1)}>
              Далі <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Seconds left, counted from the server's remaining time (not the device clock). Calls onExpire on zero and every 5 s while stuck. */
function useCountdown(remainingMs: number, onExpire: () => void) {
  const [end] = useState(() => Date.now() + remainingMs);
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  const lastExpireAt = useRef(0);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= end && (lastExpireAt.current === 0 || t - lastExpireAt.current >= 5000)) {
        lastExpireAt.current = t;
        expire.current();
      }
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
  onChange: (v: Record<string, string> | null) => void;
}) {
  const [activeRow, setActiveRow] = useState(0);
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const pairedCount = question.left.filter(l => value[l.id]).length;
  const counts = new Map<string, number>();
  for (const l of question.left) {
    const rid = value[l.id];
    if (rid) counts.set(rid, (counts.get(rid) ?? 0) + 1);
  }
  const dupLetters = question.right
    .map((r, j) => ((counts.get(r.id) ?? 0) > 1 ? LETTERS[j] : null))
    .filter((x): x is string => x !== null);

  const currentLeft = question.left[activeRow] ?? question.left[0];
  const currentRightIdx = currentLeft ? question.right.findIndex(r => r.id === value[currentLeft.id]) : -1;

  const setCell = (leftId: string, rightId: string | null) => {
    const next = { ...value };
    if (rightId === null) delete next[leftId];
    else next[leftId] = rightId;
    onChange(Object.keys(next).length ? next : null);
  };

  const moveFocus = (row: number, col: number) => {
    const r = (row + question.left.length) % question.left.length;
    const c = (col + question.right.length) % question.right.length;
    setActiveRow(r);
    cellRefs.current.get(`${r}:${c}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid gap-x-4 gap-y-2 text-base sm:grid-cols-2">
        <ol className="flex flex-col gap-1.5 sm:gap-2">
          {question.left.map((l, i) => (
            <li key={l.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold tabular-nums">{i + 1}</span>
              {l.text}
            </li>
          ))}
        </ol>
        <ul className="flex flex-col gap-1.5 border-t pt-2 sm:gap-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          {question.right.map((r, j) => (
            <li key={r.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 font-semibold">{LETTERS[j]}</span>
              {r.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          Позначено {pairedCount} з {question.left.length}
        </p>

        {currentLeft && (
          <div className="grid gap-0.5 rounded-md border bg-sheet px-3 py-2 text-sm sm:hidden">
            <p className="font-medium tabular-nums">
              {activeRow + 1}. {currentLeft.text}
            </p>
            <p className={currentRightIdx >= 0 ? "text-foreground" : "text-muted-foreground"}>
              {currentRightIdx >= 0 ? `→ ${LETTERS[currentRightIdx]}. ${question.right[currentRightIdx].text}` : "Оберіть літеру А–" + LETTERS[question.right.length - 1]}
            </p>
          </div>
        )}

        <div className="overflow-x-auto pb-1">
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
                <tr key={l.id} role="radiogroup" aria-label={`Рядок ${i + 1}: ${l.text}`}>
                  <th scope="row" className="pr-2 text-sm font-semibold tabular-nums">
                    <button
                      type="button"
                      onClick={() => setActiveRow(i)}
                      className={cn("min-w-6 rounded px-1 py-1", activeRow === i && "bg-accent text-accent-foreground sm:bg-transparent sm:text-foreground")}
                      aria-label={`Показати рядок ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  </th>
                  {question.right.map((r, j) => {
                    const checked = value[l.id] === r.id;
                    return (
                      <td key={r.id} className="border border-input p-0">
                        <button
                          ref={el => {
                            if (el) cellRefs.current.set(`${i}:${j}`, el);
                            else cellRefs.current.delete(`${i}:${j}`);
                          }}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          aria-label={`Рядок ${i + 1} (${l.text}) — варіант ${LETTERS[j]} (${r.text})`}
                          onFocus={() => setActiveRow(i)}
                          onClick={() => {
                            setActiveRow(i);
                            setCell(l.id, checked ? null : r.id);
                          }}
                          onKeyDown={e => {
                            if (e.key === "ArrowRight") {
                              e.preventDefault();
                              moveFocus(i, j + 1);
                            } else if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              moveFocus(i, j - 1);
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              moveFocus(i + 1, j);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              moveFocus(i - 1, j);
                            } else if (e.key === "Backspace" || e.key === "Delete") {
                              e.preventDefault();
                              setCell(l.id, null);
                            }
                          }}
                          className={cn(
                            "grid size-12 cursor-pointer place-items-center bg-sheet text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                            checked && "bg-accent",
                          )}
                        >
                          {checked && <X className="size-7" strokeWidth={2.75} aria-hidden />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dupLetters.length > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Літеру {dupLetters.join(", ")} обрано в кількох рядках — перевірте відповідність.
          </p>
        )}
      </div>
    </div>
  );
}

function Order({
  touched,
  savedNotice,
  question,
  value,
  onChange,
}: {
  touched: boolean;
  savedNotice: boolean;
  question: Extract<StudentQuestion, { kind: "order" }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const text = new Map(question.items.map(i => [i.id, i.text]));
  const btnRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const move = (from: number, to: number) => {
    const id = value[from];
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
    if (to === 0) requestAnimationFrame(() => btnRefs.current.get(`${id}:down`)?.focus());
    else if (to === next.length - 1) requestAnimationFrame(() => btnRefs.current.get(`${id}:up`)?.focus());
  };
  return (
    <div>
      <ol className="flex flex-col gap-2">
        {value.map((id, pos) => (
          <li key={id} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card py-1.5 pr-1.5 pl-3">
            <span className={cn(mark, "size-8 text-sm", touched && "border-primary bg-primary text-primary-foreground")}>{pos + 1}</span>
            <span className="flex-1 text-base leading-snug">{text.get(id)}</span>
            <Button
              ref={el => {
                if (el) btnRefs.current.set(`${id}:up`, el);
                else btnRefs.current.delete(`${id}:up`);
              }}
              variant="ghost"
              size="icon-lg"
              className={cn("size-11", EXAM_BTN)}
              disabled={pos === 0}
              aria-label={`«${text.get(id)}» вище`}
              onClick={() => move(pos, pos - 1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              ref={el => {
                if (el) btnRefs.current.set(`${id}:down`, el);
                else btnRefs.current.delete(`${id}:down`);
              }}
              variant="ghost"
              size="icon-lg"
              className={cn("size-11", EXAM_BTN)}
              disabled={pos === value.length - 1}
              aria-label={`«${text.get(id)}» нижче`}
              onClick={() => move(pos, pos + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      {!touched ? (
        <Button type="button" variant="outline" className={cn("mt-3 h-12 w-full text-base", EXAM_BTN)} onClick={() => onChange(value)}>
          <Check aria-hidden /> Підтвердити поточний порядок
        </Button>
      ) : (
        savedNotice && <p className="mt-2 text-xs text-muted-foreground">Порядок зафіксовано.</p>
      )}
    </div>
  );
}

/** On the «Вітаю» screen: the test is over, give the student their screen back. */
export function LeaveFullscreen() {
  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  return null;
}
