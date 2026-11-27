// Times are shown in Kyiv time whatever the server's zone is (Vercel runs in UTC).
const zone = { timeZone: "Europe/Kyiv" } as const;
const timeFmt = new Intl.DateTimeFormat("uk", { ...zone, hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("uk", { ...zone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const hhmm = (d: Date) => timeFmt.format(d);
export const dayTime = (d: Date) => dateFmt.format(d);
export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Ukrainian plural selector: 1 → one, 2–4 → few, 5–20 / 0 → many. */
export function pluralUk(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const questionsLabel = (n: number) => `${n} ${pluralUk(n, "питання", "питання", "питань")}`;
export const studentsLabel = (n: number) => `${n} ${pluralUk(n, "учень", "учні", "учнів")}`;

const CYRILLIC_LOOKALIKES: Record<string, string> = {
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Н: "H",
  І: "I",
  К: "K",
  М: "M",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
};

/** Normalizes class codes typed on a Ukrainian keyboard layout to Latin look-alikes. */
export function normalizeClassCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[АВСЕНІКМОРТХ]/g, ch => CYRILLIC_LOOKALIKES[ch] ?? ch);
}
