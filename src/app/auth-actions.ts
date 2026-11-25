"use server";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, users } from "@/db/schema";
import { createSession, destroySession, startStudentSession } from "@/lib/auth";
import { hashSecret, verifySecret } from "@/lib/secret";

export type FormState = { error: string } | undefined;

const MAX_PINS = 5;
// Verified when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "FhUYEBnafY_jhjYcOsegpw.J6I2Qps4FHD2b-vbiU7Stfdw-eWtKSfmxp41d_GJQmo";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function loginStaff(_: FormState, fd: FormData): Promise<FormState> {
  const [u] = await db.select({ id: users.id, hash: users.passwordHash }).from(users).where(eq(users.email, str(fd, "email").toLowerCase()));
  const ok = await verifySecret(String(fd.get("password") ?? ""), u?.hash ?? DUMMY_HASH);
  if (!u || !ok) return { error: "Невірний email або пароль." };
  await createSession({ userId: u.id });
  redirect("/dashboard");
}

export async function loginStudent(_: FormState, fd: FormData): Promise<FormState> {
  const pin = str(fd, "pin");
  if (!/^\d{4}$/.test(pin)) return { error: "PIN складається з 4 цифр." };
  const [s] = await db
    .select({ id: students.id, pinHash: students.pinHash, lockedUntil: students.lockedUntil })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(and(eq(students.id, Number(fd.get("student")) || 0), eq(classes.code, str(fd, "code").toUpperCase()), isNull(students.archivedAt)));
  if (!s) return { error: "Учня не знайдено. Почніть спочатку." };

  if (s.lockedUntil && s.lockedUntil > new Date())
    return { error: `Забагато невдалих спроб. Спробуйте через ${Math.ceil((s.lockedUntil.getTime() - Date.now()) / 60_000)} хв.` };

  if (s.pinHash === null) {
    if (pin !== str(fd, "repeat")) return { error: "PIN-коди не збігаються." };
    const [set] = await db
      .update(students)
      .set({ pinHash: await hashSecret(pin) })
      .where(and(eq(students.id, s.id), isNull(students.pinHash)))
      .returning({ id: students.id });
    if (!set) return { error: "PIN уже встановлено. Почніть спочатку." };
  } else if (!(await verifySecret(pin, s.pinHash))) {
    // Counted in SQL so parallel guesses can't slip past the limit.
    const full = sql`${students.failedPins} + 1 >= ${MAX_PINS}`;
    const [r] = await db
      .update(students)
      .set({
        failedPins: sql`case when ${full} then 0 else ${students.failedPins} + 1 end`,
        lockedUntil: sql`case when ${full} then now() + interval '15 minutes' else ${students.lockedUntil} end`,
      })
      .where(eq(students.id, s.id))
      .returning({ failedPins: students.failedPins });
    return r.failedPins === 0
      ? { error: "Забагато невдалих спроб. Вхід заблоковано на 15 хв. Якщо забули PIN, зверніться до класного керівника." }
      : { error: `Невірний PIN. Залишилось спроб: ${MAX_PINS - r.failedPins}.` };
  } else {
    await db.update(students).set({ failedPins: 0 }).where(eq(students.id, s.id));
  }

  const error = await startStudentSession(s.id);
  if (error) return { error };
  redirect("/student");
}

// Demo only: Ліцей 1 accounts from `pnpm db:seed`. Without the seed data these buttons do nothing.
const DEMO_STAFF: Record<string, string> = {
  director: "director@lyceum1.demo",
  deputy: "deputy@lyceum1.demo",
  homeroom: "boiko@lyceum1.demo",
  teacher: "savchuk@lyceum1.demo",
};

export async function quickLogin(_: FormState, fd: FormData): Promise<FormState> {
  const role = str(fd, "role");
  if (role === "student") {
    const [s] = await db
      .select({ id: students.id })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(and(eq(classes.code, "L1-9A"), eq(students.name, "Бондаренко Аліна")));
    if (!s) return { error: "Демо-дані не знайдено." };
    const error = await startStudentSession(s.id);
    if (error) return { error };
    redirect("/student");
  }
  const email = Object.hasOwn(DEMO_STAFF, role) ? DEMO_STAFF[role] : null;
  const [u] = email ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)) : [];
  if (!u) return { error: "Демо-дані не знайдено." };
  await createSession({ userId: u.id });
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
