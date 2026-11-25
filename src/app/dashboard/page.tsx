// Placeholder staff home: proves the session works. Tests, classes and reports land here next.
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default function Dashboard() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <Suspense>
        <Who />
      </Suspense>
    </main>
  );
}

async function Who() {
  const me = await requireStaff();
  const [school] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, me.schoolId));
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <p className="text-sm text-muted-foreground">{school.name}</p>
        <h1 className="text-2xl font-semibold">{me.name}</h1>
        <p className="text-muted-foreground">{me.title}</p>
      </div>
      <LogoutButton />
    </header>
  );
}
