// Resets the database to the demo data in PRODUCT.md › Demo data. WIPES EVERY TABLE first.
// Run: pnpm db:seed
import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import * as t from "./schema.ts";
import type { AttemptEventType, QuestionData } from "./schema.ts";
import { hashSecret } from "../lib/secret.ts";
import { makeShuffle, scoreAnswer, type AnswerResponse } from "../lib/questions.ts";

const PASSWORD = "demo1234";
const PIN = "1234";

const SUBJECTS = [
  "Українська мова", "Українська література", "Зарубіжна література", "Англійська мова",
  "Алгебра", "Геометрія", "Математика", "Історія України", "Всесвітня історія",
  "Географія", "Біологія", "Хімія", "Фізика", "Інформатика",
];

// Deterministic randomness, so every reseed gives the same report.
let seed = 42;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const shuffled = <T>(xs: T[]) => xs.map(x => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const minutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

// ---- question authoring: indexes into the lists instead of ids ----

type Draft = { prompt: string; points: number } & (
  | { type: "one" | "many"; options: string[]; correct: number[] }
  | { type: "match"; left: string[]; right: string[]; pairs: number[] } // pairs[i] = index in right for left[i]
  | { type: "order"; items: string[] } // in the correct order
);

const list = (xs: string[], p: string) => xs.map((text, i) => ({ id: `${p}${i + 1}`, text }));

function toData(d: Draft): QuestionData {
  if ("options" in d) return { options: list(d.options, "o"), correct: d.correct.map(i => `o${i + 1}`) };
  if ("pairs" in d)
    return { left: list(d.left, "l"), right: list(d.right, "r"), pairs: Object.fromEntries(d.pairs.map((r, i) => [`l${i + 1}`, `r${r + 1}`])) };
  return { items: list(d.items, "i") };
}

const HISTORY: Draft[] = [
  { type: "one", points: 1, prompt: "У якому році ухвалено Конституцію України?", options: ["1990", "1991", "1996", "2004"], correct: [2] },
  { type: "one", points: 1, prompt: "Хто є автором «Енеїди» — першого твору нової української літератури?", options: ["Тарас Шевченко", "Іван Котляревський", "Григорій Квітка-Основ'яненко", "Іван Франко"], correct: [1] },
  { type: "many", points: 3, prompt: "Оберіть три події, що відбулися в XVII столітті.", options: ["Люблінська унія", "Зборівський договір", "Берестейська унія", "Переяславська рада", "Полтавська битва", "Конотопська битва"], correct: [1, 3, 5] },
  { type: "match", points: 4, prompt: "Установіть відповідність між історичним діячем і подією, пов'язаною з ним.", left: ["Богдан Хмельницький", "Іван Мазепа", "Пилип Орлик", "Петро Сагайдачний"], right: ["Хотинська битва 1621 р.", "Конституція 1710 р.", "Полтавська битва 1709 р.", "Зборівська битва 1649 р.", "Люблінська унія 1569 р."], pairs: [3, 2, 1, 0] },
  { type: "order", points: 3, prompt: "Розташуйте події в хронологічній послідовності.", items: ["Люблінська унія", "Берестейська унія", "Хотинська битва", "Переяславська рада"] },
  { type: "one", points: 1, prompt: "Яке місто було гетьманською столицею за Івана Мазепи?", options: ["Чигирин", "Глухів", "Батурин", "Київ"], correct: [2] },
  { type: "many", points: 3, prompt: "Оберіть три події XVI століття.", options: ["Люблінська унія", "Хотинська битва", "Заснування Острозької академії", "Переяславська рада", "Берестейська унія"], correct: [0, 2, 4] },
  { type: "match", points: 4, prompt: "Установіть відповідність між пам'яткою та містом, де вона розташована.", left: ["Софійський собор", "Острозький замок", "Кам'янецька фортеця", "Хотинська фортеця"], right: ["Хотин", "Київ", "Батурин", "Кам'янець-Подільський", "Острог"], pairs: [1, 4, 3, 0] },
  { type: "order", points: 3, prompt: "Розташуйте гетьманів у послідовності їхнього правління.", items: ["Богдан Хмельницький", "Іван Виговський", "Іван Мазепа", "Кирило Розумовський"] },
  { type: "one", points: 1, prompt: "У якому році відбулася Полтавська битва?", options: ["1654", "1709", "1721", "1648"], correct: [1] },
  { type: "one", points: 1, prompt: "Як називався найвищий орган влади Запорозької Січі?", options: ["Генеральна військова канцелярія", "Січова рада", "Сейм", "Рада старшин"], correct: [1] },
  { type: "one", points: 1, prompt: "Хто заснував Острозьку академію?", options: ["Петро Могила", "Іван Федоров", "Василь-Костянтин Острозький", "Петро Сагайдачний"], correct: [2] },
];

const ALGEBRA: Draft[] = [
  { type: "one", points: 1, prompt: "Скільки коренів має рівняння x² + 4x + 4 = 0?", options: ["Жодного", "Один", "Два", "Безліч"], correct: [1] },
  { type: "many", points: 3, prompt: "Оберіть рівняння, коренем яких є число 2.", options: ["x² − 4 = 0", "x² − 5x + 6 = 0", "x² + 4 = 0", "x² − 3x + 2 = 0", "x² + 2x = 0"], correct: [0, 1, 3] },
  { type: "match", points: 4, prompt: "Установіть відповідність між рівнянням та його коренями.", left: ["x² − 9 = 0", "x² − 5x = 0", "x² − 6x + 9 = 0", "x² − 3x − 4 = 0"], right: ["−3 і 3", "0 і 5", "3", "−1 і 4", "1 і 4"], pairs: [0, 1, 2, 3] },
  { type: "order", points: 3, prompt: "Розташуйте рівняння за зростанням дискримінанта.", items: ["x² + 2x + 5 = 0", "x² + 2x + 1 = 0", "x² − 4x + 3 = 0", "x² − 6x = 0"] },
];

const UKRAINIAN: Draft[] = [
  { type: "one", points: 1, prompt: "Яке речення є складносурядним?", options: ["Коли сонце зійшло, туман розвіявся.", "Сонце зійшло, і туман розвіявся.", "Сонце зійшло — туман розвіявся.", "Сонце зійшло й розвіяло туман."], correct: [1] },
  { type: "many", points: 3, prompt: "Оберіть складнопідрядні речення.", options: ["Я знаю, що ти прийдеш.", "Ліс шумів, а річка мовчала.", "Де згода в сімействі, там мир і тишина.", "Вітер стих, і почався дощ.", "Якби ти знав, я б тобі сказав."], correct: [0, 2, 4] },
  { type: "match", points: 4, prompt: "Установіть відповідність між реченням і його видом.", left: ["Минуло літо, настала осінь.", "Минуло літо, і настала осінь.", "Коли минуло літо, настала осінь.", "Коли минуло літо, настала осінь, і птахи відлетіли у вирій."], right: ["складносурядне", "складнопідрядне", "безсполучникове", "з різними видами зв'язку", "просте ускладнене"], pairs: [2, 0, 1, 3] },
  { type: "order", points: 3, prompt: "Розташуйте етапи синтаксичного розбору складного речення в правильній послідовності.", items: ["Визначити граматичні основи", "Визначити засоби зв'язку між частинами", "Визначити вид складного речення", "Накреслити схему речення"] },
];

// ---- helpers ----

async function createSchool(name: string) {
  const [school] = await db.insert(t.schools).values({ name }).returning();
  const rows = await db.insert(t.subjects).values(SUBJECTS.map(s => ({ schoolId: school.id, name: s }))).returning();
  return { id: school.id, subject: Object.fromEntries(rows.map(s => [s.name, s.id])) };
}

async function createUser(schoolId: number, rank: "director" | "deputy" | "teacher", email: string, name: string, title: string) {
  const [u] = await db.insert(t.users).values({ schoolId, rank, email, name, title, passwordHash: await hashSecret(PASSWORD) }).returning();
  return u.id;
}

async function createClass(schoolId: number, name: string, grade: number, code: string, homeroomTeacherId: number, names: string[], noPin: string[] = []) {
  const [c] = await db.insert(t.classes).values({ schoolId, name, grade, code, homeroomTeacherId }).returning();
  const rows = await Promise.all(names.map(async n => ({ schoolId, classId: c.id, name: n, pinHash: noPin.includes(n) ? null : await hashSecret(PIN) })));
  const students = await db.insert(t.students).values(rows).returning();
  return { id: c.id, code, students };
}

async function createTest(v: typeof t.tests.$inferInsert, drafts: Draft[]) {
  const [test] = await db.insert(t.tests).values(v).returning();
  const qs = await db
    .insert(t.questions)
    .values(drafts.map((d, i) => ({ testId: test.id, position: i, type: d.type, prompt: d.prompt, points: d.points, data: toData(d) })))
    .returning();
  return { id: test.id, qs };
}

type Q = (typeof t.questions.$inferSelect);

function respond(q: Q, ok: boolean): AnswerResponse {
  const d = q.data;
  if ("options" in d) {
    if (ok) return d.correct;
    const wrong = d.options.map(o => o.id).filter(id => !d.correct.includes(id));
    return q.type === "one" ? [pick(wrong)] : [...d.correct.slice(1), pick(wrong)];
  }
  if ("pairs" in d) {
    const r = { ...d.pairs };
    if (!ok) {
      const [a, b] = shuffled(Object.keys(r));
      [r[a], r[b]] = [r[b], r[a]];
    }
    return r;
  }
  const ids = d.items.map(i => i.id);
  if (!ok) {
    const k = Math.floor(rand() * (ids.length - 1));
    [ids[k], ids[k + 1]] = [ids[k + 1], ids[k]];
  }
  return ids;
}

// ---- seed ----

await db.execute(sql`truncate schools restart identity cascade`);

// Ліцей 1: the playground.
const l1 = await createSchool("Ліцей № 1");
await createUser(l1.id, "director", "director@lyceum1.demo", "Кравець Оксана Петрівна", "Директор");
const deputy = await createUser(l1.id, "deputy", "deputy@lyceum1.demo", "Іванюк Наталія Василівна", "Заступник директора з НВР");
const historian = await createUser(l1.id, "teacher", "boiko@lyceum1.demo", "Бойко Ігор Миколайович", "Учитель історії");
const mathTeacher = await createUser(l1.id, "teacher", "savchuk@lyceum1.demo", "Савчук Марина Олегівна", "Учитель математики");

const c9a = await createClass(l1.id, "9-А", 9, "L1-9A", historian, [
  "Бондаренко Аліна", "Васильченко Максим", "Гнатюк Софія", "Дмитренко Олег", "Єрмоленко Дарина",
  "Захарченко Ілля", "Іваненко Марта", "Карпенко Богдан", "Коваленко Анна", "Кравчук Тарас",
], ["Захарченко Ілля"]); // absent from the history test, never logged in
const c10b = await createClass(l1.id, "10-Б", 10, "L1-10B", deputy, [
  "Литвиненко Вероніка", "Мельник Андрій", "Мороз Катерина", "Олійник Денис",
  "Павленко Юлія", "Петренко Олег", "Романюк Злата", "Савченко Назар",
], ["Савченко Назар"]);

const history = await createTest(
  { schoolId: l1.id, authorId: historian, subjectId: l1.subject["Історія України"], grade: 9, topic: "Козацька доба", title: "Козацька доба: контрольна робота", timeLimitMin: 20, status: "locked" },
  HISTORY,
);
// Open to 9-А right now, so the student quick login has a test to take.
const algebra = await createTest(
  { schoolId: l1.id, authorId: mathTeacher, subjectId: l1.subject["Алгебра"], grade: 9, topic: "Квадратні рівняння", title: "Квадратні рівняння", timeLimitMin: 15, status: "locked" },
  ALGEBRA,
);
await db.insert(t.assignments).values({ testId: algebra.id, classId: c9a.id, openedBy: mathTeacher, wholeClass: true });
await createTest(
  { schoolId: l1.id, authorId: deputy, subjectId: l1.subject["Українська мова"], grade: 10, topic: "Складне речення", title: "Складне речення: види зв'язку", timeLimitMin: 15 },
  UKRAINIAN,
);

// The history test was written by 9-А a week ago, so the report has data.
const openedAt = new Date(Date.now() - 7 * 86_400_000);
openedAt.setUTCHours(8, 0, 0, 0); // 10:00 Kyiv
const [assignment] = await db
  .insert(t.assignments)
  .values({ testId: history.id, classId: c9a.id, openedBy: historian, openedAt, closedAt: minutes(openedAt, 45), wholeClass: true })
  .returning();

const absent = "Захарченко Ілля";
const events: Record<string, [AttemptEventType, number][]> = {
  "Васильченко Максим": [["blur", 5], ["hidden", 6], ["unlock", 8]],
  "Дмитренко Олег": [["blur", 9]],
  "Карпенко Богдан": [["paste", 4], ["blur", 11], ["blur", 12]],
};
const maxScore = history.qs.reduce((s, q) => s + q.points, 0);

for (const st of c9a.students.filter(s => s.name !== absent)) {
  const skill = 0.2 + rand() * 0.75;
  const startedAt = minutes(openedAt, 1 + Math.floor(rand() * 3));
  const finishedAt = minutes(startedAt, 12 + Math.floor(rand() * 8));
  const answered = history.qs.filter(() => rand() > 0.05).map(q => {
    const response = respond(q, rand() < skill);
    return { questionId: q.id, response, points: scoreAnswer(q, response), updatedAt: minutes(startedAt, 1 + rand() * 10) };
  });
  const ev = events[st.name] ?? [];
  const [attempt] = await db
    .insert(t.attempts)
    .values({
      assignmentId: assignment.id, studentId: st.id, classId: c9a.id, startedAt, deadlineAt: minutes(startedAt, 20), finishedAt,
      status: "finished", shuffle: makeShuffle(history.qs, rand), score: answered.reduce((s, a) => s + a.points, 0), maxScore, flagged: ev.length > 0,
    })
    .returning();
  await db.insert(t.answers).values(answered.map(a => ({ ...a, attemptId: attempt.id })));
  if (ev.length) await db.insert(t.attemptEvents).values(ev.map(([type, m]) => ({ attemptId: attempt.id, type, at: minutes(startedAt, m) })));
}

await db.insert(t.materials).values([
  { schoolId: l1.id, authorId: historian, subjectId: l1.subject["Історія України"], grade: 9, topic: "Козацька доба", type: "website", title: "Гетьманщина — Вікіпедія", url: "https://uk.wikipedia.org/wiki/Гетьманщина" },
  { schoolId: l1.id, authorId: historian, subjectId: l1.subject["Історія України"], grade: 9, topic: "Козацька доба", type: "website", title: "Запорозька Січ — Вікіпедія", url: "https://uk.wikipedia.org/wiki/Запорозька_Січ" },
  { schoolId: l1.id, authorId: mathTeacher, subjectId: l1.subject["Алгебра"], grade: 8, topic: "Квадратні рівняння", type: "website", title: "Квадратне рівняння — Вікіпедія", url: "https://uk.wikipedia.org/wiki/Квадратне_рівняння" },
]);

// Ліцей 2: proves isolation, normal login only.
const l2 = await createSchool("Ліцей № 2");
await createUser(l2.id, "director", "director@lyceum2.demo", "Гончаренко Віктор Іванович", "Директор");
await createUser(l2.id, "teacher", "lysenko@lyceum2.demo", "Лисенко Ольга Сергіївна", "Учитель англійської мови");

console.log(`Seeded. Password for every user: ${PASSWORD}. Student PIN: ${PIN}.
Class codes: ${c9a.code} (9-А), ${c10b.code} (10-Б). Without a PIN yet (first login): Захарченко Ілля, Савченко Назар.`);
