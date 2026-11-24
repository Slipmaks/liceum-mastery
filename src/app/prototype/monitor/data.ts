// Synthetic class for the monitor prototype.
export type Status = "locked" | "writing" | "done" | "idle";
export type Student = {
  id: number;
  name: string;
  status: Status;
  answered: boolean[];
  /** Time left for writing / locked, submit time for done. */
  time: string;
  flagged: boolean;
  events: { label: string; at: string }[];
};

export const TOTAL = 12;

const sheet = (n: number, gaps: number[] = []) =>
  Array.from({ length: TOTAL }, (_, i) => i < n && !gaps.includes(i));

const E = {
  hidden: "Згорнув вкладку",
  blur: "Втрата фокусу",
  paste: "Спроба вставки",
  reopen: "Повторне відкриття",
  device: "Вхід з іншого пристрою",
};

type Row = [string, Status, number, string, (keyof typeof E)[]?, number[]?];

const ROWS: Row[] = [
  ["Бондаренко Аліна", "writing", 9, "14:02"],
  ["Васильченко Максим", "locked", 6, "17:48", ["blur", "hidden"]],
  ["Гнатюк Софія", "done", 12, "10:29"],
  ["Дмитренко Олег", "writing", 7, "16:11", ["blur"]],
  ["Єрмоленко Дарина", "writing", 10, "15:37", [], [4]],
  ["Захарченко Ілля", "writing", 5, "19:20"],
  ["Іваненко Марта", "done", 12, "10:31"],
  ["Карпенко Богдан", "writing", 8, "15:02"],
  ["Коваленко Анна", "writing", 11, "13:45"],
  ["Кравчук Тарас", "locked", 4, "21:06", ["reopen"]],
  ["Литвиненко Вероніка", "writing", 9, "14:58", ["paste"], [2]],
  ["Мельник Андрій", "idle", 0, ""],
  ["Мороз Катерина", "writing", 6, "18:30"],
  ["Олійник Денис", "done", 12, "10:27"],
  ["Павленко Юлія", "writing", 10, "14:12"],
  ["Петренко Олег", "writing", 3, "22:40"],
  ["Романюк Злата", "done", 11, "10:33", [], [7]],
  ["Савченко Назар", "writing", 7, "16:50", ["blur", "blur", "blur"]],
  ["Ткаченко Ірина", "writing", 8, "15:44"],
  ["Ткачук Владислав", "idle", 0, ""],
  ["Федоренко Поліна", "writing", 9, "14:26"],
  ["Харченко Артем", "done", 12, "10:24"],
  ["Цимбалюк Ольга", "writing", 6, "17:15"],
  ["Шевченко Христина", "done", 12, "10:30"],
  ["Шевчук Матвій", "writing", 10, "13:58"],
  ["Юрченко Даниїл", "writing", 5, "19:02"],
  ["Яковенко Соломія", "writing", 8, "16:05"],
  ["Ярошенко Кирило", "writing", 7, "16:40"],
];

const clock = (i: number) => `10:${String(12 + ((i * 3) % 11)).padStart(2, "0")}`;

export const STUDENTS: Student[] = ROWS.map(([name, status, n, time, ev = [], gaps], i) => ({
  id: i + 1,
  name,
  status,
  answered: sheet(n, gaps),
  time,
  flagged: ev.length > 0,
  events: ev.map((e, j) => ({ label: E[e], at: clock(i + j) })),
}));
