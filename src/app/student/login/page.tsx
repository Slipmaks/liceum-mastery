// Student login: class code → pick your name → PIN (set on first login). PRODUCT.md › Student accounts.
import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, schools, students } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { normalizeClassCode } from "@/lib/format";
import { PinForm } from "./pin-form";
import { RosterPicker } from "./roster-picker";

export const metadata: Metadata = { title: "Вхід для учня" };

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
  const code = typeof sp.code === "string" ? normalizeClassCode(sp.code) : "";
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
          <BackLink href="/student/login">Інший код класу</BackLink>
        </header>
        <RosterPicker code={code} roster={roster.map(s => ({ id: s.id, name: s.name }))} />
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
      <Form action="/student/login" className="grid gap-4 rounded-lg border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="code" className="text-base">
            Код класу
          </Label>
          <Input
            id="code"
            name="code"
            defaultValue={code}
            required
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Напр. L1-9A"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "code-hint code-error" : "code-hint"}
            className="h-12 font-mono text-lg tracking-widest uppercase tabular-nums placeholder:font-sans placeholder:text-base placeholder:normal-case placeholder:tracking-normal"
          />
          <p id="code-hint" className="text-sm text-pretty text-muted-foreground">
            Код класу запитайте в учителя або класного керівника.
          </p>
        </div>
        <FormError id="code-error">{error}</FormError>
        <SubmitButton className="h-12 text-base" pendingLabel="Шукаю…">
          Далі
        </SubmitButton>
      </Form>
      <BackLink href="/">На головну</BackLink>
    </>
  );
}

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-12 w-fit items-center text-base text-muted-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
