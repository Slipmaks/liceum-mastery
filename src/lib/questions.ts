// Pure question logic: shuffle, the student's view, response validation, scoring (PRODUCT.md › Tests, Taking a test).
// No database access, so the seed script can use it too. Reads correct answers: never import it into a client component.
import type { QuestionData, Shuffle } from "@/db/schema";

type Type = "one" | "many" | "match" | "order";
type Question = { id: number; type: Type; prompt: string; points: number; data: QuestionData };
type Item = { id: string; text: string };

/** one / many: picked option ids; match: leftId → rightId; order: item ids as arranged. */
export type AnswerResponse = string[] | Record<string, string>;

/** What the browser gets: no `correct`, no `pairs`, and items in this student's order. */
export type StudentQuestion = { id: number; type: Type; prompt: string } & (
  | { kind: "choice"; options: Item[] }
  | { kind: "match"; left: Item[]; right: Item[] }
  | { kind: "order"; items: Item[] }
);

/** The list that gets shuffled per student: options, the right column of a match, or the order items. */
const shuffled = (d: QuestionData) => ("options" in d ? d.options : "pairs" in d ? d.right : d.items);

export function makeShuffle(qs: Pick<Question, "id" | "data">[], rand = Math.random): Shuffle {
  const mix = <T>(xs: T[]) => xs.map(x => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map(p => p[1]);
  return {
    questions: mix(qs.map(q => q.id)),
    options: Object.fromEntries(qs.map(q => [q.id, mix(shuffled(q.data).map(x => x.id))])),
  };
}

export function forStudent(q: Question, order: string[] = []): StudentQuestion {
  const d = q.data;
  const byId = new Map(shuffled(d).map(x => [x.id, { id: x.id, text: x.text }]));
  // Fall back to the stored order if the shuffle doesn't cover every item.
  const mixed = order.length === byId.size && order.every(id => byId.has(id)) ? order.map(id => byId.get(id)!) : [...byId.values()];
  const base = { id: q.id, type: q.type, prompt: q.prompt };
  if ("options" in d) return { ...base, kind: "choice", options: mixed };
  if ("pairs" in d) return { ...base, kind: "match", left: d.left.map(x => ({ id: x.id, text: x.text })), right: mixed };
  return { ...base, kind: "order", items: mixed };
}

/** Checks a response from the browser against the question. An empty answer is `null`, not a response. */
export function isValidResponse(q: Pick<Question, "type" | "data">, r: unknown): r is AnswerResponse {
  const d = q.data;
  const ids = (xs: Item[]) => new Set(xs.map(x => x.id));
  const isList = (v: unknown, allowed: Set<string>): v is string[] =>
    Array.isArray(v) && new Set(v).size === v.length && v.every(x => typeof x === "string" && allowed.has(x));
  if ("options" in d) return isList(r, ids(d.options)) && (q.type === "one" ? r.length === 1 : r.length > 0);
  if ("pairs" in d) {
    if (typeof r !== "object" || r === null || Array.isArray(r)) return false;
    const left = ids(d.left);
    const right = ids(d.right);
    const pairs = Object.entries(r);
    return pairs.length > 0 && pairs.every(([l, v]) => left.has(l) && typeof v === "string" && right.has(v));
  }
  return isList(r, ids(d.items)) && r.length === d.items.length;
}

/** Partial credit as in PRODUCT.md. A response of the wrong shape scores 0. */
export function scoreAnswer(q: Pick<Question, "type" | "points" | "data">, r: AnswerResponse): number {
  const d = q.data;
  if ("options" in d) {
    if (!Array.isArray(r)) return 0;
    const picked = new Set(r);
    if (q.type === "one") return picked.size === 1 && d.correct.includes(r[0]) ? q.points : 0;
    const hits = d.correct.filter(id => picked.has(id)).length;
    return q.points * Math.max(0, (hits - (picked.size - hits)) / d.correct.length);
  }
  if ("pairs" in d) {
    if (Array.isArray(r)) return 0;
    return (q.points * d.left.filter(l => r[l.id] === d.pairs[l.id]).length) / d.left.length;
  }
  if (!Array.isArray(r)) return 0;
  return (q.points * d.items.filter((item, i) => r[i] === item.id).length) / d.items.length;
}

/** 12-point grade: max(1, round(12 × score / max)). */
export const grade12 = (score: number, max: number) => (max > 0 ? Math.max(1, Math.round((12 * score) / max)) : 1);

/** The correct answer in response form. */
export const correctResponse = (d: QuestionData): AnswerResponse => ("options" in d ? d.correct : "pairs" in d ? d.pairs : d.items.map(i => i.id));

/** A response as readable lines for teachers: picked options, «1. left → right» pairs, or the arranged order. */
export function answerLines(d: QuestionData, r: AnswerResponse): string[] {
  if ("pairs" in d) {
    const right = new Map(d.right.map(x => [x.id, x.text]));
    const pairs = Array.isArray(r) ? {} : r;
    return d.left.map((l, i) => `${i + 1}. ${l.text} → ${right.get(pairs[l.id]) ?? "—"}`);
  }
  const text = new Map(shuffled(d).map(x => [x.id, x.text]));
  const ids = Array.isArray(r) ? r : [];
  return "options" in d ? ids.map(id => text.get(id) ?? "?") : ids.map((id, i) => `${i + 1}. ${text.get(id) ?? "?"}`);
}
