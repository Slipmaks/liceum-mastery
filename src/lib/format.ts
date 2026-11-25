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
