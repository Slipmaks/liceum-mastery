// Student login: class code → pick your name → PIN (set on first login). PRODUCT.md › Student accounts.
import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { classes, schools, students } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { PinForm } from "./pin-form";

const collator = new Intl.Collator("uk");

export default function StudentLogin({ searchParams }: PageProps<"/student/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-4">
      <Suspense>
        <Step searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Step({ searchParams }: Pick<PageProps<"/student/login">, "searchParams">) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code.trim().toUpperCase() : "";
  if (!code) return <CodeForm />;

  const [cls] = await db
    .select({ id: classes.id, name: classes.name, school: schools.name })
    .from(classes)
    .innerJoin(schools, eq(schools.id, classes.schoolId))
    .where(eq(classes.code, code));
  if (!cls) return <CodeForm code={code} error="Клас з таким кодом не знайдено. Перевірте код у класного керівника." />;

  const roster = (
    await db
      .select({ id: students.id, name: students.name, hasPin: sql<boolean>`${students.pinHash} is not null` })
      .from(students)
      .where(and(eq(students.classId, cls.id), isNull(students.archivedAt)))
      .orderBy(asc(students.name))
  ).sort((a, b) => collator.compare(a.name, b.name));

  const student = roster.find(s => s.id === Number(sp.s));
  const heading = (
    <p className="text-sm text-muted-foreground">
      {cls.school} · {cls.name}
    </p>
  );

  if (!student)
    return (
      <>
        <header className="grid gap-1">
          {heading}
          <h1 className="text-2xl font-semibold">Оберіть своє ім’я</h1>
        </header>
        <ul className="grid gap-2">
          {roster.map(s => (
            <li key={s.id}>
              <Link
                href={`/student/login?code=${encodeURIComponent(code)}&s=${s.id}`}
                className="flex h-14 items-center justify-between rounded-lg border bg-card px-3 text-base hover:bg-muted"
              >
                {s.name}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <BackLink href="/student/login">Інший код класу</BackLink>
      </>
    );

  return (
    <>
      <header className="grid gap-1">
        {heading}
        <h1 className="text-2xl font-semibold">{student.name}</h1>
        {!student.hasPin && <p className="text-muted-foreground">Це ваш перший вхід. Придумайте PIN з 4 цифр і запам’ятайте його.</p>}
      </header>
      <PinForm code={code} studentId={student.id} firstTime={!student.hasPin} />
      <BackLink href={`/student/login?code=${encodeURIComponent(code)}`}>Це не я</BackLink>
    </>
  );
}

function CodeForm({ code, error }: { code?: string; error?: string }) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Вхід для учня</h1>
      <Form action="/student/login" className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="code" className="text-base">
            Код класу
          </Label>
          <Input id="code" name="code" defaultValue={code} required autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} className="h-12 text-base uppercase" />
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" className="h-12 text-base">
          Далі
        </Button>
      </Form>
      <BackLink href="/">На головну</BackLink>
    </>
  );
}

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="py-2 text-muted-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
