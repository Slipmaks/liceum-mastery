"use server";
// Classes and rosters: admins create classes and set homeroom teachers; admins and the homeroom teacher manage the roster.
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, sessions, students, users } from "@/db/schema";
import { requireStaff, type Staff } from "@/lib/auth";
import { getClass, isAdmin } from "@/lib/staff";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;
// No 0/O, 1/I/L: students type it on a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Class fields from the form, or null if invalid. The homeroom teacher must be active staff of this school. */
async function classFields(fd: FormData, me: Staff) {
  const name = str(fd, "name").slice(0, 20);
  const grade = num(fd, "grade");
  if (!name || !(grade >= 1 && grade <= 11)) return null;
  const teacherId = num(fd, "homeroom");
  const [teacher] = teacherId
    ? await db.select({ id: users.id }).from(users).where(and(eq(users.id, teacherId), eq(users.schoolId, me.schoolId), isNull(users.archivedAt)))
    : [];
  return { name, grade, homeroomTeacherId: teacher?.id ?? null };
}

const nameTaken = async (schoolId: number, name: string, except = 0) =>
  (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.schoolId, schoolId), sql`lower(${classes.name}) = lower(${name})`, ne(classes.id, except)))).length > 0;

export type CreateClassState = { error: string; values: { name: string; grade: string; homeroom: string }; at: number } | undefined;
export type UpdateClassState = { error?: string; ok?: boolean; values?: { name: string; grade: string; homeroom: string }; at: number } | undefined;
export type AddStudentsState = { error?: string; ok?: boolean; message?: string; value?: string; at: number } | undefined;

export async function createClassState(_: CreateClassState, fd: FormData): Promise<CreateClassState> {
  const me = await requireStaff();
  if (!isAdmin(me)) redirect("/dashboard");
  const values = { name: str(fd, "name"), grade: str(fd, "grade") || "9", homeroom: str(fd, "homeroom") };
  const fields = await classFields(fd, me);
  if (!fields) return { error: "Вкажіть коректну назву класу.", values, at: Date.now() };
  if (await nameTaken(me.schoolId, fields.name)) return { error: "Клас із такою назвою вже існує.", values, at: Date.now() };
  for (let i = 0; i < 5; i++) {
    const [c] = await db.insert(classes).values({ ...fields, schoolId: me.schoolId, code: newCode() }).onConflictDoNothing().returning({ id: classes.id });
    if (c) redirect(`/dashboard/classes/${c.id}`);
  }
  return { error: "Не вдалося створити клас. Спробуйте ще раз.", values, at: Date.now() };
}

export async function updateClassState(_: UpdateClassState, fd: FormData): Promise<UpdateClassState> {
  const me = await requireStaff();
  const c = await getClass(num(fd, "class"), me);
  if (!c || !isAdmin(me)) redirect("/dashboard/classes");
  const values = { name: str(fd, "name"), grade: str(fd, "grade") || String(c.grade), homeroom: str(fd, "homeroom") };
  const fields = await classFields(fd, me);
  if (!fields) return { error: "Вкажіть коректну назву класу.", values, at: Date.now() };
  if (await nameTaken(me.schoolId, fields.name, c.id)) return { error: "Клас із такою назвою вже існує.", values, at: Date.now() };
  await db.update(classes).set(fields).where(eq(classes.id, c.id));
  revalidatePath(`/dashboard/classes/${c.id}`);
  revalidatePath("/dashboard/classes");
  return { ok: true, values: { name: fields.name, grade: String(fields.grade), homeroom: fields.homeroomTeacherId ? String(fields.homeroomTeacherId) : "" }, at: Date.now() };
}

export async function addStudentsState(_: AddStudentsState, fd: FormData): Promise<AddStudentsState> {
  const me = await requireStaff();
  const c = await getClass(num(fd, "class"), me);
  if (!c) redirect("/dashboard/classes");
  const raw = String(fd.get("names") ?? "");
  const unique = [...new Set(raw.split("\n").map(n => n.trim().replace(/\s+/g, " ").slice(0, 100)).filter(Boolean))];
  if (unique.length === 0) return { error: "Введіть хоча б одне ім’я.", value: raw, at: Date.now() };
  if (unique.length > 60)
    return { error: `За один раз можна додати до 60 учнів (у списку ${unique.length}). Поділіть список на частини.`, value: raw, at: Date.now() };
  await db.insert(students).values(unique.map(name => ({ name, schoolId: c.schoolId, classId: c.id })));
  revalidatePath(`/dashboard/classes/${c.id}`);
  revalidatePath("/dashboard/classes");
  return { ok: true, message: `Додано учнів: ${unique.length}.`, value: "", at: Date.now() };
}

export async function createClass(fd: FormData) {
  const me = await requireStaff();
  if (!isAdmin(me)) redirect("/dashboard");
  const fields = await classFields(fd, me);
  if (!fields || (await nameTaken(me.schoolId, fields.name))) redirect("/dashboard/classes?error=1");
  // The code is unique across all schools; on the rare clash, draw again.
  for (let i = 0; i < 5; i++) {
    const [c] = await db.insert(classes).values({ ...fields, schoolId: me.schoolId, code: newCode() }).onConflictDoNothing().returning({ id: classes.id });
    if (c) redirect(`/dashboard/classes/${c.id}`);
  }
  redirect("/dashboard/classes?error=1");
}

export async function updateClass(fd: FormData) {
  const me = await requireStaff();
  const c = await getClass(num(fd, "class"), me);
  if (!c || !isAdmin(me)) redirect("/dashboard/classes");
  const fields = await classFields(fd, me);
  if (fields && !(await nameTaken(me.schoolId, fields.name, c.id))) await db.update(classes).set(fields).where(eq(classes.id, c.id));
  revalidatePath(`/dashboard/classes/${c.id}`);
}

/** «Додати учнів»: one name per line. A student sets their PIN on first login. */
export async function addStudents(fd: FormData) {
  const me = await requireStaff();
  const c = await getClass(num(fd, "class"), me);
  if (!c) redirect("/dashboard/classes");
  const names = [...new Set(str(fd, "names").split("\n").map(n => n.trim().replace(/\s+/g, " ").slice(0, 100)).filter(Boolean))].slice(0, 60);
  if (names.length) await db.insert(students).values(names.map(name => ({ name, schoolId: c.schoolId, classId: c.id })));
  revalidatePath(`/dashboard/classes/${c.id}`);
}

/** The student and their class, if the caller manages that class's roster. */
async function managedStudent(fd: FormData) {
  const me = await requireStaff();
  const [s] = await db.select().from(students).where(and(eq(students.id, num(fd, "student")), eq(students.schoolId, me.schoolId)));
  const c = s && (await getClass(s.classId, me));
  if (!c) redirect("/dashboard/classes");
  return { s, c, me };
}

/** A lost PIN: the student sets a new one on their next login. Their sessions end, and a lockout is lifted. */
export async function resetPin(fd: FormData) {
  const { s, c } = await managedStudent(fd);
  await db.batch([
    db.update(students).set({ pinHash: null, failedPins: 0, lockedUntil: null }).where(eq(students.id, s.id)),
    db.delete(sessions).where(eq(sessions.studentId, s.id)),
  ]);
  revalidatePath(`/dashboard/classes/${c.id}`);
}

/** A student who changes class. Their attempts keep the class they started in. */
export async function moveStudent(fd: FormData) {
  const { s, c, me } = await managedStudent(fd);
  const [target] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, num(fd, "to")), eq(classes.schoolId, me.schoolId)));
  if (target && target.id !== c.id) await db.update(students).set({ classId: target.id }).where(eq(students.id, s.id));
  revalidatePath(`/dashboard/classes/${c.id}`);
}

/** A student who leaves is archived, never deleted, so their attempts stay. */
export async function archiveStudent(fd: FormData) {
  const { s, c } = await managedStudent(fd);
  await db.batch([
    db.update(students).set({ archivedAt: sql`now()` }).where(and(eq(students.id, s.id), isNull(students.archivedAt))),
    db.delete(sessions).where(eq(sessions.studentId, s.id)),
  ]);
  revalidatePath(`/dashboard/classes/${c.id}`);
}

export async function restoreStudent(fd: FormData) {
  const { s, c } = await managedStudent(fd);
  await db.update(students).set({ archivedAt: null }).where(and(eq(students.id, s.id), isNotNull(students.archivedAt)));
  revalidatePath(`/dashboard/classes/${c.id}`);
}
