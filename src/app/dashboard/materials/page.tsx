// Materials bank: every teacher and admin of the school sees all of it; filters on every field, search by title.
import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { and, asc, desc, eq, ilike, ne } from "drizzle-orm";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/db";
import { materials, subjects, users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { isAdmin, schoolSubjects } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmForm } from "@/components/confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteMaterial } from "./actions";
import { MATERIAL_TYPES, TYPE_LABEL, type MaterialType } from "./types";

const select = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";
const collator = new Intl.Collator("uk");

export default function MaterialsPage({ searchParams }: PageProps<"/dashboard/materials">) {
  return (
    <Suspense>
      <Materials searchParams={searchParams} />
    </Suspense>
  );
}

async function Materials({ searchParams }: Pick<PageProps<"/dashboard/materials">, "searchParams">) {
  const me = await requireStaff();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const f = { q: one("q"), type: one("type"), subject: Number(one("subject")) || 0, grade: Number(one("grade")) || 0, topic: one("topic"), author: Number(one("author")) || 0 };

  const school = eq(materials.schoolId, me.schoolId);
  const [rows, topics, authors, subjectList] = await Promise.all([
    db
      .select({
        id: materials.id,
        title: materials.title,
        url: materials.url,
        type: materials.type,
        grade: materials.grade,
        topic: materials.topic,
        subject: subjects.name,
        authorId: materials.authorId,
        author: users.name,
      })
      .from(materials)
      .innerJoin(subjects, eq(subjects.id, materials.subjectId))
      .innerJoin(users, eq(users.id, materials.authorId))
      .where(
        and(
          school,
          f.q ? ilike(materials.title, `%${f.q.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
          MATERIAL_TYPES.includes(f.type as MaterialType) ? eq(materials.type, f.type as MaterialType) : undefined,
          f.subject ? eq(materials.subjectId, f.subject) : undefined,
          f.grade ? eq(materials.grade, f.grade) : undefined,
          f.topic ? eq(materials.topic, f.topic) : undefined,
          f.author ? eq(materials.authorId, f.author) : undefined,
        ),
      )
      .orderBy(desc(materials.createdAt)),
    db.selectDistinct({ topic: materials.topic }).from(materials).where(and(school, ne(materials.topic, ""))).orderBy(asc(materials.topic)),
    db.selectDistinct({ id: users.id, name: users.name }).from(materials).innerJoin(users, eq(users.id, materials.authorId)).where(school),
    schoolSubjects(me.schoolId),
  ]);
  topics.sort((a, b) => collator.compare(a.topic, b.topic));
  authors.sort((a, b) => collator.compare(a.name, b.name));
  const filtered = Object.values(f).some(Boolean);
  const mayEdit = (authorId: number) => isAdmin(me) || authorId === me.id;

  return (
    <div className="grid max-w-6xl gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Матеріали</h1>
          <p className="mt-1 text-sm text-muted-foreground">Посилання на відео, презентації, документи й сайти для вчителів школи.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/materials/new">
            <Plus aria-hidden /> Додати матеріал
          </Link>
        </Button>
      </header>

      <Form action="/dashboard/materials" className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1.5 text-sm">
          Пошук за назвою
          <Input name="q" type="search" defaultValue={f.q} className="w-56" />
        </label>
        <Filter label="Тип" name="type" value={f.type} options={MATERIAL_TYPES.map(t => [t, TYPE_LABEL[t]])} />
        <Filter label="Предмет" name="subject" value={f.subject} options={subjectList.map(s => [s.id, s.name])} />
        <Filter label="Клас" name="grade" value={f.grade} options={Array.from({ length: 11 }, (_, i) => [i + 1, String(i + 1)])} />
        <Filter label="Тема" name="topic" value={f.topic} options={topics.map(t => [t.topic, t.topic])} />
        <Filter label="Автор" name="author" value={f.author} options={authors.map(a => [a.id, a.name])} />
        <Button type="submit" variant="outline">
          Показати
        </Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href="/dashboard/materials">Скинути</Link>
          </Button>
        )}
      </Form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{filtered ? "Нічого не знайдено. Спробуйте змінити фільтри." : "Матеріалів ще немає. Додайте перший."}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead>Назва</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead className="text-right">Клас</TableHead>
                <TableHead>Тема</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead>
                  <span className="sr-only">Дії</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                      {m.title}
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-label="(відкриється в новій вкладці)" />
                    </a>
                  </TableCell>
                  <TableCell>{TYPE_LABEL[m.type]}</TableCell>
                  <TableCell>{m.subject}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.grade ?? ""}</TableCell>
                  <TableCell className="text-muted-foreground">{m.topic}</TableCell>
                  <TableCell className="text-muted-foreground">{m.author}</TableCell>
                  <TableCell>
                    {mayEdit(m.authorId) && (
                      <div className="flex justify-end">
                        <Button asChild variant="ghost" size="icon-sm">
                          <Link href={`/dashboard/materials/${m.id}/edit`} aria-label={`Редагувати «${m.title}»`}>
                            <Pencil aria-hidden />
                          </Link>
                        </Button>
                        <ConfirmForm action={deleteMaterial} message={`Видалити «${m.title}»?`}>
                          <input type="hidden" name="id" value={m.id} />
                          <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Видалити «${m.title}»`}>
                            <Trash2 aria-hidden />
                          </Button>
                        </ConfirmForm>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Filter({ label, name, value, options }: { label: string; name: string; value: string | number; options: [string | number, string][] }) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <select name={name} defaultValue={value || ""} className={select}>
        <option value="">Усі</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
