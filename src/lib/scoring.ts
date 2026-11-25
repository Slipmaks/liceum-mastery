// Scoring rules: PRODUCT.md › Tests. Server-only, since it reads the correct answers.
import type { QuestionData } from "@/db/schema";

type Question = { type: "one" | "many" | "match" | "order"; points: number; data: QuestionData };

/** one / many: picked option ids; match: leftId → rightId; order: item ids as arranged. */
export type AnswerResponse = string[] | Record<string, string>;

/** Partial credit as in PRODUCT.md. A response of the wrong shape scores 0. */
export function scoreAnswer(q: Question, r: AnswerResponse): number {
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
