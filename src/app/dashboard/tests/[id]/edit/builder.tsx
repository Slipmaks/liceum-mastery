"use client";
// One page: the test's details and its questions; a question is added by choosing its type. Drafts autosave.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-form";
import { cn } from "@/lib/utils";
import { blankQuestion, MAX_ITEMS, nextId, questionProblems, TYPE_LABEL, type Draft, type DraftQuestion, type Item, type QType } from "@/lib/draft";
import { saveDraft } from "../../../actions";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Є", "Ж"];
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1);
const SAVE = { saved: "Збережено", dirty: "Є незбережені зміни", saving: "Зберігаю…", error: "Не вдалося зберегти. Спробую ще раз." };

type Q = DraftQuestion & { key: number };
const move = <T,>(xs: T[], from: number, to: number) => {
  const next = [...xs];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};

export function Builder({ testId, subjects, initial }: { testId: number; subjects: { id: number; name: string }[]; initial: Draft }) {
  const router = useRouter();
  const { questions: initialQuestions, ...initialMeta } = initial;
  const [meta, setMeta] = useState(initialMeta);
  const [qs, setQs] = useState<Q[]>(() => initialQuestions.map((q, i) => ({ ...q, key: i + 1 })));
  const [minutesText, setMinutesText] = useState(String(initialMeta.timeLimitMin));
  const [pointsText, setPointsText] = useState<Record<number, string>>(() => Object.fromEntries(initialQuestions.map((q, i) => [i + 1, String(q.points)])));
  const [save, setSave] = useState<keyof typeof SAVE>("saved");
  const [deletingKey, setDeletingKey] = useState<number | null>(null);
  const [flushing, setFlushing] = useState(false);
  const nextKeyRef = useRef(initialQuestions.length + 1);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draft: Draft = { ...meta, questions: qs.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, data: q.data })) };
  const qIssues = qs.map((q, i) => ({ index: i, issues: questionProblems(q, i) }));
  const todo: { text: string; qIndex?: number }[] = [
    ...(!draft.title.trim() ? [{ text: "Немає назви тесту." }] : []),
    ...(draft.questions.length === 0 ? [{ text: "Немає жодного питання." }] : []),
    ...qIssues.flatMap(entry => entry.issues.map(text => ({ text, qIndex: entry.index }))),
  ];

  // Autosave 800 ms after the last change; a reply for an older version doesn't mark the newer one saved.
  const changed = () => {
    version.current++;
    setSave("dirty");
  };
  const editMeta = (patch: Partial<typeof meta>) => {
    setMeta(m => ({ ...m, ...patch }));
    changed();
  };
  const editQs = (fn: (qs: Q[]) => Q[]) => {
    setQs(fn);
    changed();
  };
  const editQ = (key: number, fn: (q: Q) => Q) => editQs(list => list.map(q => (q.key === key ? fn(q) : q)));
  const addQuestion = (t: QType) => {
    const key = nextKeyRef.current++;
    const fresh = blankQuestion(t);
    setPointsText(p => ({ ...p, [key]: String(fresh.points) }));
    editQs(l => [...l, { ...fresh, key }]);
  };

  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });

  const runSave = useCallback(
    async (v: number, snapshot: Draft) => {
      setSave("saving");
      const ok = await saveDraft(testId, snapshot).then(r => r.ok, () => false);
      if (ok && v > savedVersion.current) savedVersion.current = v;
      if (version.current === v) setSave(ok ? "saved" : "error");
      return ok;
    },
    [testId],
  );

  useEffect(() => {
    if (save !== "dirty" && save !== "error") return;
    const v = version.current;
    const t = setTimeout(
      () => {
        timerRef.current = null;
        void runSave(v, latest.current);
      },
      save === "error" ? 5000 : 800,
    );
    timerRef.current = t;
    return () => {
      clearTimeout(t);
      if (timerRef.current === t) timerRef.current = null;
    };
  }, [save, meta, qs, runSave]);

  // Leaving through any in-app link (sidebar, breadcrumbs) unmounts the builder: save the last edit on the way out.
  useEffect(() => {
    const [v, sv, last] = [version, savedVersion, latest];
    return () => {
      if (v.current > sv.current) void saveDraft(testId, last.current);
    };
  }, [testId]);

  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  const flushSave = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savedVersion.current === version.current && save === "saved") return true;
    setFlushing(true);
    const ok = await runSave(version.current, latest.current);
    setFlushing(false);
    return ok;
  };

  const goToTest = async () => {
    await flushSave();
    router.push(`/dashboard/tests/${testId}`);
  };

  const openPreview = async () => {
    if (savedVersion.current === version.current && save === "saved") {
      window.open(`/preview/${testId}`, "_blank", "noopener,noreferrer");
      return;
    }
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    await flushSave();
    if (win && !win.closed) win.location.href = `/preview/${testId}`;
    else router.push(`/preview/${testId}`);
  };

  return (
    <div className="grid max-w-3xl gap-6 pb-24">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-end justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur-xs lg:-mx-8 lg:px-8">
        <div>
          <p className="text-sm text-muted-foreground">
            <button type="button" onClick={goToTest} disabled={flushing} className="cursor-pointer underline-offset-4 hover:underline">
              До сторінки тесту
            </button>
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{meta.title.trim() || "Новий тест"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p role="status" className={cn("text-sm tabular-nums", save === "saved" ? "text-muted-foreground" : "text-foreground")}>
            {flushing ? SAVE.saving : SAVE[save]}
          </p>
          <Button type="button" variant="outline" disabled={flushing} onClick={openPreview}>
            <Eye aria-hidden /> Переглянути як учень
          </Button>
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="title">Назва</Label>
          <Input id="title" value={meta.title} maxLength={200} placeholder="Наприклад: Квадратні рівняння, контрольна робота" onChange={e => editMeta({ title: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Предмет</Label>
          <Select id="subject" value={meta.subjectId} onChange={e => editMeta({ subjectId: Number(e.target.value) })}>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="grade">Клас</Label>
            <Select id="grade" value={meta.grade} onChange={e => editMeta({ grade: Number(e.target.value) })}>
              {GRADES.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="minutes">Час, хв</Label>
            <Input
              id="minutes"
              type="number"
              min={1}
              max={300}
              value={minutesText}
              onChange={e => {
                const raw = e.target.value;
                setMinutesText(raw);
                const parsed = Number(raw);
                if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 1 && parsed <= 300) {
                  editMeta({ timeLimitMin: Math.round(parsed) });
                }
              }}
              onBlur={() => {
                const parsed = Number(minutesText);
                const clamped = Number.isFinite(parsed) && parsed >= 1 ? Math.min(300, Math.round(parsed)) : meta.timeLimitMin;
                setMinutesText(String(clamped));
                if (clamped !== meta.timeLimitMin) editMeta({ timeLimitMin: clamped });
              }}
              className="tabular-nums"
            />
          </div>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="topic">Тема</Label>
          <Input id="topic" value={meta.topic} maxLength={200} onChange={e => editMeta({ topic: e.target.value })} />
        </div>
      </section>

      <ol className="grid gap-4">
        {qs.map((q, i) => {
          const issues = qIssues[i]?.issues ?? [];
          return (
            <li key={q.key} id={`q-${i + 1}`} className="grid scroll-mt-24 gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium tabular-nums">
                  {i + 1}. {TYPE_LABEL[q.type]}
                </p>
                <div className="flex items-center gap-1">
                  <Label className="mr-2 text-sm font-normal text-muted-foreground">
                    Бали
                    <Input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={pointsText[q.key] ?? String(q.points)}
                      onChange={e => {
                        const raw = e.target.value;
                        setPointsText(p => ({ ...p, [q.key]: raw }));
                        const parsed = Number(raw.replace(",", "."));
                        if (raw.trim() !== "" && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
                          editQ(q.key, x => ({ ...x, points: Math.round(parsed * 100) / 100 }));
                        }
                      }}
                      onBlur={() => {
                        const raw = (pointsText[q.key] ?? "").replace(",", ".");
                        const parsed = Number(raw);
                        const clamped = raw.trim() !== "" && Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed * 100) / 100)) : q.points;
                        setPointsText(p => ({ ...p, [q.key]: String(clamped) }));
                        if (clamped !== q.points) editQ(q.key, x => ({ ...x, points: clamped }));
                      }}
                      className="h-8 w-20 tabular-nums"
                    />
                  </Label>
                  <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Питання ${i + 1} вище`} onClick={() => editQs(l => move(l, i, i - 1))}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={i === qs.length - 1} aria-label={`Питання ${i + 1} нижче`} onClick={() => editQs(l => move(l, i, i + 1))}>
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Видалити питання ${i + 1}`}
                    onClick={() => setDeletingKey(q.key)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
              <textarea
                aria-label={`Текст питання ${i + 1}`}
                value={q.prompt}
                rows={2}
                maxLength={2000}
                placeholder="Текст питання"
                onChange={e => editQ(q.key, x => ({ ...x, prompt: e.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
              <QuestionBody q={q} n={i + 1} onChange={fn => editQ(q.key, fn)} />
              {issues.length > 0 && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{issues.join(" ")}</p>
              )}
            </li>
          );
        })}
      </ol>

      <section className="grid gap-2">
        <p className="text-sm font-medium">Додати питання</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as QType[]).map(t => (
            <Button key={t} variant="outline" onClick={() => addQuestion(t)}>
              <Plus aria-hidden /> {TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg bg-muted p-4 text-sm">
        {todo.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>Тест готовий. Відкрити його для класу можна на сторінці тесту.</p>
            <Button type="button" onClick={goToTest} disabled={flushing}>
              До сторінки тесту
            </Button>
          </div>
        ) : (
          <>
            <p className="font-medium">Що треба доробити, щоб відкрити тест для класу:</p>
            <ul className="list-disc pl-5">
              {todo.map((p, idx) => (
                <li key={`${idx}-${p.text}`}>
                  {p.qIndex !== undefined ? (
                    <a href={`#q-${p.qIndex + 1}`} className="underline-offset-4 hover:underline">
                      {p.text}
                    </a>
                  ) : (
                    p.text
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ConfirmDialog
        open={deletingKey !== null}
        onOpenChange={open => {
          if (!open) setDeletingKey(null);
        }}
        title="Видалити питання?"
        message={`Видалити питання ${deletingKey !== null ? qs.findIndex(x => x.key === deletingKey) + 1 : ""}?`}
        confirmLabel="Видалити питання"
        onConfirm={() => {
          if (deletingKey !== null) editQs(l => l.filter(x => x.key !== deletingKey));
        }}
      />
    </div>
  );
}

function QuestionBody({ q, n, onChange }: { q: Q; n: number; onChange: (fn: (q: Q) => Q) => void }) {
  const d = q.data;
  const set = (data: DraftQuestion["data"]) => onChange(x => ({ ...x, data }) as Q);

  if ("options" in d) {
    const many = q.type === "many";
    return (
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm text-muted-foreground">Варіанти: позначте {many ? "всі правильні" : "правильний"}</legend>
        {d.options.map((o, j) => (
          <div key={o.id} className="flex items-center gap-2">
            <input
              type={many ? "checkbox" : "radio"}
              name={`correct-${q.key}`}
              aria-label={`Варіант ${LETTERS[j]} правильний`}
              checked={d.correct.includes(o.id)}
              onChange={() =>
                set({ ...d, correct: many ? (d.correct.includes(o.id) ? d.correct.filter(c => c !== o.id) : [...d.correct, o.id]) : [o.id] })
              }
              className="size-4 shrink-0 accent-foreground"
            />
            <span className="w-5 shrink-0 text-sm font-semibold">{LETTERS[j]}</span>
            <ItemInput label={`Питання ${n}, варіант ${LETTERS[j]}`} item={o} onChange={text => set({ ...d, options: d.options.map(x => (x.id === o.id ? { ...x, text } : x)) })} />
            <RemoveButton
              label={`Видалити варіант ${LETTERS[j]}`}
              disabled={d.options.length <= 2}
              onClick={() => set({ options: d.options.filter(x => x.id !== o.id), correct: d.correct.filter(c => c !== o.id) })}
            />
          </div>
        ))}
        <AddButton disabled={d.options.length >= MAX_ITEMS} onClick={() => set({ ...d, options: [...d.options, { id: nextId(d.options, "o"), text: "" }] })}>
          Варіант
        </AddButton>
      </fieldset>
    );
  }

  if ("pairs" in d) {
    return (
      <div className="grid gap-4">
        <fieldset className="grid content-start gap-2">
          <legend className="mb-1 text-sm text-muted-foreground">Рядки і правильна літера</legend>
          {d.left.map((l, j) => (
            <div key={l.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-sm font-semibold tabular-nums">{j + 1}</span>
              <ItemInput label={`Питання ${n}, рядок ${j + 1}`} item={l} onChange={text => set({ ...d, left: d.left.map(x => (x.id === l.id ? { ...x, text } : x)) })} />
              <Select
                aria-label={`Правильна літера для рядка ${j + 1}`}
                value={d.pairs[l.id] ?? ""}
                onChange={e => set({ ...d, pairs: { ...d.pairs, [l.id]: e.target.value } })}
                className="w-16 shrink-0"
              >
                <option value="" disabled>
                  —
                </option>
                {d.right.map((r, k) => (
                  <option key={r.id} value={r.id}>
                    {LETTERS[k]}
                  </option>
                ))}
              </Select>
              <RemoveButton
                label={`Видалити рядок ${j + 1}`}
                disabled={d.left.length <= 2}
                onClick={() => set({ ...d, left: d.left.filter(x => x.id !== l.id), pairs: Object.fromEntries(Object.entries(d.pairs).filter(([k]) => k !== l.id)) })}
              />
            </div>
          ))}
          <AddButton disabled={d.left.length >= MAX_ITEMS} onClick={() => set({ ...d, left: [...d.left, { id: nextId(d.left, "l"), text: "" }] })}>
            Рядок
          </AddButton>
        </fieldset>
        <fieldset className="grid content-start gap-2 border-t pt-3">
          <legend className="mb-1 text-sm text-muted-foreground">Варіанти (як у НМТ, на один більше)</legend>
          {d.right.map((r, k) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-sm font-semibold">{LETTERS[k]}</span>
              <ItemInput label={`Питання ${n}, варіант ${LETTERS[k]}`} item={r} onChange={text => set({ ...d, right: d.right.map(x => (x.id === r.id ? { ...x, text } : x)) })} />
              <RemoveButton
                label={`Видалити варіант ${LETTERS[k]}`}
                disabled={d.right.length <= 2}
                onClick={() =>
                  set({ ...d, right: d.right.filter(x => x.id !== r.id), pairs: Object.fromEntries(Object.entries(d.pairs).filter(([, v]) => v !== r.id)) })
                }
              />
            </div>
          ))}
          <AddButton disabled={d.right.length >= MAX_ITEMS} onClick={() => set({ ...d, right: [...d.right, { id: nextId(d.right, "r"), text: "" }] })}>
            Варіант
          </AddButton>
        </fieldset>
      </div>
    );
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm text-muted-foreground">Пункти у правильному порядку. Учні побачать їх перемішаними.</legend>
      {d.items.map((it, j) => (
        <div key={it.id} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-sm font-semibold tabular-nums">{j + 1}</span>
          <ItemInput label={`Питання ${n}, пункт ${j + 1}`} item={it} onChange={text => set({ items: d.items.map(x => (x.id === it.id ? { ...x, text } : x)) })} />
          <Button variant="ghost" size="icon-sm" disabled={j === 0} aria-label={`Пункт ${j + 1} вище`} onClick={() => set({ items: move(d.items, j, j - 1) })}>
            <ArrowUp aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={j === d.items.length - 1} aria-label={`Пункт ${j + 1} нижче`} onClick={() => set({ items: move(d.items, j, j + 1) })}>
            <ArrowDown aria-hidden />
          </Button>
          <RemoveButton label={`Видалити пункт ${j + 1}`} disabled={d.items.length <= 2} onClick={() => set({ items: d.items.filter(x => x.id !== it.id) })} />
        </div>
      ))}
      <AddButton disabled={d.items.length >= MAX_ITEMS} onClick={() => set({ items: [...d.items, { id: nextId(d.items, "i"), text: "" }] })}>
        Пункт
      </AddButton>
    </fieldset>
  );
}

function ItemInput({ label, item, onChange }: { label: string; item: Item; onChange: (text: string) => void }) {
  return <Input aria-label={label} value={item.text} maxLength={2000} onChange={e => onChange(e.target.value)} />;
}

function RemoveButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} className="shrink-0">
      <X aria-hidden />
    </Button>
  );
}

function AddButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={onClick} className="w-fit">
      <Plus aria-hidden /> {children}
    </Button>
  );
}
