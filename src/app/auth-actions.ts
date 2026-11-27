"use server";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, invites, students, users } from "@/db/schema";
import { createSession, destroySession, startStudentSession } from "@/lib/auth";
import { normalizeClassCode } from "@/lib/format";
import { hashSecret, verifySecret } from "@/lib/secret";

export type FormState = { error: string; email?: string } | undefined;

const MAX_PINS = 5;
// Verified when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "FhUYEBnafY_jhjYcOsegpw.J6I2Qps4FHD2b-vbiU7Stfdw-eWtKSfmxp41d_GJQmo";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function loginStaff(_: FormState, fd: FormData): Promise<FormState> {
  const [u] = await db
    .select({ id: users.id, hash: users.passwordHash })
    .from(users)
    .where(and(eq(users.email, str(fd, "email").toLowerCase()), isNull(users.archivedAt)));
  const ok = await verifySecret(String(fd.get("password") ?? ""), u?.hash ?? DUMMY_HASH);
  if (!u || !ok) return { error: "Невірний email або пароль.", email: str(fd, "email") };
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
    .where(and(eq(students.id, Number(fd.get("student")) || 0), eq(classes.code, normalizeClassCode(str(fd, "code"))), isNull(students.archivedAt)));
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
  const [u] = email ? await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), isNull(users.archivedAt))) : [];
  if (!u) return { error: "Демо-дані не знайдено." };
  await createSession({ userId: u.id });
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Accepting an invite: the invitee sets their name and password, then is logged in (PRODUCT.md › Teacher accounts). */
export async function acceptInvite(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name").slice(0, 200);
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "Вкажіть ім’я." };
  if (password.length < 8) return { error: "Пароль має бути не коротшим за 8 символів." };
  if (password !== String(fd.get("repeat") ?? "")) return { error: "Паролі не збігаються." };

  const tokenHash = createHash("sha256").update(str(fd, "token")).digest("hex");
  const open = and(eq(invites.tokenHash, tokenHash), isNull(invites.usedAt), gt(invites.expiresAt, sql`now()`));
  const [invite] = await db.select().from(invites).where(open);
  if (!invite) return { error: "Посилання вже використано або воно застаріло. Попросіть нове." };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email));
  if (taken) return { error: "Користувач з цим email уже є. Увійдіть зі своїм паролем." };

  // Claim the invite first: a double submit can't create two accounts.
  const [claimed] = await db.update(invites).set({ usedAt: sql`now()` }).where(open).returning({ email: invites.email });
  if (!claimed) return { error: "Посилання вже використано." };
  const [u] = await db
    .insert(users)
    .values({ schoolId: invite.schoolId, email: invite.email, name, rank: invite.rank, passwordHash: await hashSecret(password) })
    .returning({ id: users.id });
  await createSession({ userId: u.id });
  redirect("/dashboard");
}
