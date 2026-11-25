"use server";
// Staff, invites and subjects: admins only (PRODUCT.md › People and permissions, Teacher accounts).
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, invites, materials, sessions, subjects, tests, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { assignableRanks, isAdmin, outranks } from "@/lib/staff";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = () => revalidatePath("/dashboard/school");

async function requireAdmin() {
  const me = await requireStaff();
  if (!isAdmin(me)) redirect("/dashboard");
  return me;
}

export type InviteState = { error: string } | { token: string; email: string } | undefined;

/**
 * An invite link valid for 7 days. The demo sends no email: the admin copies the link to Viber or Telegram.
 * Only the token's SHA-256 is stored, so the link is shown once, right now.
 */
export async function inviteStaff(_: InviteState, fd: FormData): Promise<InviteState> {
  const me = await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const rank = str(fd, "rank");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return { error: "Вкажіть правильний email." };
  const allowed = assignableRanks(me).find(r => r === rank);
  if (!allowed) return { error: "Оберіть посаду." };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (taken) return { error: "Користувач з таким email уже є." };

  const token = randomBytes(32).toString("base64url");
  await db.batch([
    // A new link for the same email replaces the old one.
    db.delete(invites).where(and(eq(invites.schoolId, me.schoolId), eq(invites.email, email), isNull(invites.usedAt))),
    db.insert(invites).values({
      tokenHash: createHash("sha256").update(token).digest("hex"),
      schoolId: me.schoolId,
      email,
      rank: allowed,
      invitedBy: me.id,
      expiresAt: sql`now() + interval '7 days'`,
    }),
  ]);
  done();
  return { token, email };
}

export async function revokeInvite(fd: FormData) {
  const me = await requireAdmin();
  await db.delete(invites).where(and(eq(invites.tokenHash, str(fd, "invite")), eq(invites.schoolId, me.schoolId), isNull(invites.usedAt)));
  done();
}

/** The user, if the caller outranks them. */
async function lowerUser(fd: FormData) {
  const me = await requireAdmin();
  const [u] = await db
    .select({ id: users.id, rank: users.rank })
    .from(users)
    .where(and(eq(users.id, Number(fd.get("user")) || 0), eq(users.schoolId, me.schoolId), isNull(users.archivedAt)));
  if (!u || !outranks(me, u.rank)) redirect("/dashboard/school");
  return { me, u };
}

export async function updateStaff(fd: FormData) {
  const { me, u } = await lowerUser(fd);
  const name = str(fd, "name").slice(0, 200);
  const rank = assignableRanks(me).find(r => r === str(fd, "rank")) ?? u.rank;
  if (name) await db.update(users).set({ name, rank, title: str(fd, "title").slice(0, 200) || null }).where(eq(users.id, u.id));
  done();
}

/** «Звільнити»: archived, logged out, and no longer homeroom teacher of any class. Their tests and results stay. */
export async function archiveStaff(fd: FormData) {
  const { u } = await lowerUser(fd);
  await db.batch([
    db.update(users).set({ archivedAt: sql`now()` }).where(eq(users.id, u.id)),
    db.delete(sessions).where(eq(sessions.userId, u.id)),
    db.update(classes).set({ homeroomTeacherId: null }).where(eq(classes.homeroomTeacherId, u.id)),
  ]);
  done();
}

export async function addSubject(fd: FormData) {
  const me = await requireAdmin();
  const name = str(fd, "name").slice(0, 100);
  if (!name) return;
  const [dup] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.schoolId, me.schoolId), sql`lower(${subjects.name}) = lower(${name})`));
  if (!dup) await db.insert(subjects).values({ schoolId: me.schoolId, name });
  done();
}

/** Only a subject no test or material uses. */
export async function deleteSubject(fd: FormData) {
  const me = await requireAdmin();
  const id = Number(fd.get("subject")) || 0;
  await db.delete(subjects).where(
    and(
      eq(subjects.id, id),
      eq(subjects.schoolId, me.schoolId),
      sql`not exists (select 1 from ${tests} where ${tests.subjectId} = ${id})`,
      sql`not exists (select 1 from ${materials} where ${materials.subjectId} = ${id})`,
    ),
  );
  done();
}
