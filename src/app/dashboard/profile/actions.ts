"use server";
// Everyone edits their own profile (PRODUCT.md › People and permissions). Rank is not part of it.
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { currentSessionId, requireStaff } from "@/lib/auth";
import { hashSecret, verifySecret } from "@/lib/secret";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function updateProfile(fd: FormData) {
  const me = await requireStaff();
  const name = str(fd, "name").slice(0, 200);
  if (name) await db.update(users).set({ name, title: str(fd, "title").slice(0, 200) || null }).where(eq(users.id, me.id));
  revalidatePath("/dashboard", "layout");
}

export type PasswordState = { error?: string; ok?: boolean } | undefined;

/** Needs the current password. Other devices are logged out; this one stays. */
export async function changePassword(_: PasswordState, fd: FormData): Promise<PasswordState> {
  const me = await requireStaff();
  const next = String(fd.get("next") ?? "");
  if (next.length < 8) return { error: "Новий пароль має бути не коротшим за 8 символів." };
  if (next !== String(fd.get("repeat") ?? "")) return { error: "Нові паролі не збігаються." };
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, me.id));
  if (!(await verifySecret(String(fd.get("current") ?? ""), u.hash))) return { error: "Поточний пароль невірний." };
  await db.batch([
    db.update(users).set({ passwordHash: await hashSecret(next) }).where(eq(users.id, me.id)),
    db.delete(sessions).where(and(eq(sessions.userId, me.id), ne(sessions.id, await currentSessionId()))),
  ]);
  return { ok: true };
}
