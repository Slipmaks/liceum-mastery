"use server";
// Materials bank: links only (PRODUCT.md › Materials bank). Any staff member adds; the author or an admin edits and deletes.
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, subjects } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { editableMaterials as editable } from "@/lib/staff";
import { MATERIAL_TYPES, type MaterialType } from "./types";

/** On error the entered values come back, because React resets the form after an action. */
export type FormState = { error: string; values: Record<string, string>; at: number } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Only http(s): the URL is rendered as a link, so `javascript:` and friends must never get in. */
function httpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? s : null; // stored as typed, so Cyrillic stays readable
  } catch {
    return null;
  }
}

export async function saveMaterial(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireStaff();
  // `at` remounts the form: a reset alone would leave the <select>s empty.
  const fail = (error: string) => ({ error, at: Date.now(), values: Object.fromEntries([...fd].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)])) });
  const title = str(fd, "title");
  const topic = str(fd, "topic");
  const url = httpUrl(str(fd, "url"));
  const type = str(fd, "type") as MaterialType;
  const grade = str(fd, "grade") ? Number(str(fd, "grade")) : null;
  if (!title || title.length > 200) return fail("Вкажіть назву до 200 символів.");
  if (!url || url.length > 2000) return fail("Посилання має бути повною адресою, що починається з https:// або http://.");
  if (!MATERIAL_TYPES.includes(type)) return fail("Оберіть тип матеріалу.");
  if (grade !== null && !(Number.isInteger(grade) && grade >= 1 && grade <= 11)) return fail("Клас має бути від 1 до 11.");
  if (topic.length > 200) return fail("Тема задовга.");
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, Number(fd.get("subject")) || 0), eq(subjects.schoolId, me.schoolId)));
  if (!subject) return fail("Оберіть предмет.");

  const values = { title, url, type, grade, topic, subjectId: subject.id };
  const id = Number(fd.get("id")) || 0;
  if (id) {
    const [done] = await db.update(materials).set(values).where(and(eq(materials.id, id), editable(me))).returning({ id: materials.id });
    if (!done) return fail("Цей матеріал може змінити лише його автор або адміністрація.");
  } else {
    await db.insert(materials).values({ ...values, schoolId: me.schoolId, authorId: me.id });
  }
  redirect("/dashboard/materials");
}

export async function deleteMaterial(fd: FormData) {
  const me = await requireStaff();
  await db.delete(materials).where(and(eq(materials.id, Number(fd.get("id")) || 0), editable(me)));
  redirect("/dashboard/materials");
}
