// The test builder's data: shape checks for autosave and the readiness list shown before a test can be opened.
// Pure, so the builder (client) and the server actions share it. PRODUCT.md › Tests.
import type { QuestionData } from "@/db/schema";

export type QType = "one" | "many" | "match" | "order";
export type Item = { id: string; text: string };
export type DraftQuestion = { type: QType; prompt: string; points: number; data: QuestionData };
export type Draft = { title: string; subjectId: number; grade: number; topic: string; timeLimitMin: number; questions: DraftQuestion[] };

export const TYPE_LABEL: Record<QType, string> = {
  one: "Одна правильна відповідь",
  many: "Кілька правильних відповідей",
  match: "Відповідність",
  order: "Послідовність",
};

export const MAX_ITEMS = 8;
const MAX_TEXT = 2000;
const MAX_QUESTIONS = 100;

const blankItems = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, text: "" }));

/** A new question as NMT shapes it: 4 options, 5 for «many», 4 rows × 5 letters for a match, 4 items to order. */
export function blankQuestion(type: QType): DraftQuestion {
  if (type === "one") return { type, prompt: "", points: 1, data: { options: blankItems("o", 4), correct: [] } };
  if (type === "many") return { type, prompt: "", points: 3, data: { options: blankItems("o", 5), correct: [] } };
  if (type === "match") return { type, prompt: "", points: 4, data: { left: blankItems("l", 4), right: blankItems("r", 5), pairs: {} } };
  return { type, prompt: "", points: 3, data: { items: blankItems("i", 4) } };
}

/** An id not yet used in the list: o1, o2, … */
export const nextId = (items: Item[], prefix: string) => `${prefix}${Math.max(0, ...items.map(x => Number(x.id.slice(prefix.length)) || 0)) + 1}`;

// ---- shape check: lenient on content (drafts may be half-written), strict on structure ----

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_TEXT;
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function items(v: unknown): Item[] | null {
  if (!Array.isArray(v) || v.length > MAX_ITEMS) return null;
  // Ids are short and plain, which also keeps keys like "__proto__" out of `pairs`.
  const out = v.map(x => (isObj(x) && typeof x.id === "string" && /^[a-z]\d{1,3}$/.test(x.id) && isText(x.text) ? { id: x.id, text: x.text } : null));
  return out.every(x => x !== null) && new Set(out.map(x => x.id)).size === out.length ? out : null;
}

function question(v: unknown): DraftQuestion | null {
  if (!isObj(v) || !isText(v.prompt) || typeof v.points !== "number" || !(v.points >= 0 && v.points <= 100) || !isObj(v.data)) return null;
  const d = v.data;
  const base = { prompt: v.prompt, points: Math.round(v.points * 100) / 100 };
  if (v.type === "one" || v.type === "many") {
    const options = items(d.options);
    if (!options || !Array.isArray(d.correct)) return null;
    const ids = new Set(options.map(o => o.id));
    const correct = [...new Set(d.correct)].filter((c): c is string => typeof c === "string" && ids.has(c));
    return { ...base, type: v.type, data: { options, correct } };
  }
  if (v.type === "match") {
    const left = items(d.left);
    const right = items(d.right);
    if (!left || !right || !isObj(d.pairs)) return null;
    const pairs = d.pairs;
    const rightIds = new Set(right.map(r => r.id));
    const kept = left.flatMap(l => (typeof pairs[l.id] === "string" && rightIds.has(pairs[l.id] as string) ? [[l.id, pairs[l.id] as string]] : []));
    return { ...base, type: "match", data: { left, right, pairs: Object.fromEntries(kept) } };
  }
  if (v.type === "order") {
    const list = items(d.items);
    return list && { ...base, type: "order", data: { items: list } };
  }
  return null;
}

/** Validates a draft from the browser. Null when its structure is wrong; content problems are left to `problems()`. */
export function parseDraft(v: unknown): Draft | null {
  if (!isObj(v) || !isText(v.title) || !isText(v.topic) || !isInt(v.subjectId, 1, 2 ** 31 - 1) || !isInt(v.grade, 1, 11) || !isInt(v.timeLimitMin, 1, 300))
    return null;
  if (!Array.isArray(v.questions) || v.questions.length > MAX_QUESTIONS) return null;
  const qs = v.questions.map(question);
  if (!qs.every(q => q !== null)) return null;
  return { title: v.title, topic: v.topic, subjectId: v.subjectId, grade: v.grade, timeLimitMin: v.timeLimitMin, questions: qs };
}

/** Single-question validation shared between per-question builder markers and the test readiness list. */
export function questionProblems(q: Pick<DraftQuestion, "type" | "prompt" | "points" | "data">, index: number): string[] {
  const out: string[] = [];
  const n = `Питання ${index + 1}`;
  const blank = (xs: Item[]) => xs.some(x => !x.text.trim());
  if (!q.prompt.trim()) out.push(`${n}: немає тексту питання.`);
  if (!(q.points > 0)) out.push(`${n}: балів має бути більше за 0.`);
  const data = q.data;
  if ("options" in data) {
    if (data.options.length < 2) out.push(`${n}: потрібно щонайменше 2 варіанти.`);
    if (blank(data.options)) out.push(`${n}: є порожній варіант.`);
    if (q.type === "one" && data.correct.length !== 1) out.push(`${n}: позначте одну правильну відповідь.`);
    if (q.type === "many" && data.correct.length === 0) out.push(`${n}: позначте правильні відповіді.`);
  } else if ("pairs" in data) {
    if (data.left.length < 2) out.push(`${n}: потрібно щонайменше 2 рядки.`);
    if (data.right.length < data.left.length) out.push(`${n}: варіантів має бути не менше, ніж рядків.`);
    if (blank(data.left) || blank(data.right)) out.push(`${n}: є порожній рядок або варіант.`);
    if (data.left.some(l => !data.pairs[l.id])) out.push(`${n}: для кожного рядка оберіть правильну літеру.`);
    else if (new Set(Object.values(data.pairs)).size < data.left.length) out.push(`${n}: два рядки мають однакову відповідь.`);
  } else {
    if (data.items.length < 2) out.push(`${n}: потрібно щонайменше 2 пункти.`);
    if (blank(data.items)) out.push(`${n}: є порожній пункт.`);
  }
  return out;
}

/** What stops the test from being opened to a class, in Ukrainian. Empty means ready. */
export function problems(d: Pick<Draft, "title" | "questions">): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push("Немає назви тесту.");
  if (d.questions.length === 0) out.push("Немає жодного питання.");
  d.questions.forEach((q, i) => {
    out.push(...questionProblems(q, i));
  });
  return out;
}
