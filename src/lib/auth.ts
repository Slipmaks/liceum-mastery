// Sessions: a random token in an httpOnly cookie, only its SHA-256 in the database. PRODUCT.md › Stack, Anti-cheat.
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, sessions, students, users } from "@/db/schema";
import { finalizeDue, recordEvent } from "@/lib/attempt";

const COOKIE = "sid";
const STAFF_TTL = 30 * 86_400_000;
const STUDENT_TTL = 8 * 3_600_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type Staff = { kind: "staff"; id: number; schoolId: number; name: string; rank: "director" | "deputy" | "teacher"; title: string | null };
export type Student = { kind: "student"; id: number; schoolId: number; classId: number; name: string };

/** The signed-in person, or null. Memoised per request. */
export const getSession = cache(async (): Promise<Staff | Student | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      user: { id: users.id, schoolId: users.schoolId, name: users.name, rank: users.rank, title: users.title },
      student: { id: students.id, schoolId: students.schoolId, classId: students.classId, name: students.name, archivedAt: students.archivedAt },
    })
    .from(sessions)
    .leftJoin(users, eq(users.id, sessions.userId))
    .leftJoin(students, eq(students.id, sessions.studentId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, sql`now()`)));
  if (row?.user) return { kind: "staff", ...row.user };
  if (row?.student && !row.student.archivedAt) {
    const { id, schoolId, classId, name } = row.student;
    return { kind: "student", id, schoolId, classId, name };
  }
  return null;
});

export async function requireStaff(): Promise<Staff> {
  const s = await getSession();
  if (s?.kind !== "staff") redirect("/login");
  return s;
}

export async function requireStudent(): Promise<Student> {
  const s = await getSession();
  if (s?.kind !== "student") redirect("/student/login");
  return s;
}

/** Server Actions only: sets the cookie. */
export async function createSession(owner: { userId: number } | { studentId: number }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ("userId" in owner ? STAFF_TTL : STUDENT_TTL));
  // No cron, so expired sessions are swept on every login.
  await db.batch([
    db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`)),
    db.insert(sessions).values({ id: sha256(token), ...owner, expiresAt }),
  ]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

/**
 * One active session per student. While an attempt is in progress, a login from another device is refused,
 * logged, and locks + flags the attempt. Otherwise the new login replaces any older session.
 * Returns an error message, or null once the session is set.
 */
export async function startStudentSession(studentId: number): Promise<string | null> {
  await finalizeDue(eq(attempts.studentId, studentId));
  const [active] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.studentId, studentId), ne(attempts.status, "finished")))
    .limit(1);
  if (active) {
    const [other] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.studentId, studentId), gt(sessions.expiresAt, sql`now()`)))
      .limit(1);
    if (other) {
      await recordEvent(active.id, "second_device");
      return "Тест уже відкрито на іншому пристрої. Зверніться до вчителя.";
    }
  }
  await db.delete(sessions).where(eq(sessions.studentId, studentId));
  await createSession({ studentId });
  return null;
}

/** Server Actions only. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  store.delete(COOKIE);
}
