// Placeholder student home: proves the session works. Open tests are listed here next.
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classes } from "@/db/schema";
import { requireStudent } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default function StudentHome() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <Suspense>
        <Who />
      </Suspense>
    </main>
  );
}

async function Who() {
  const me = await requireStudent();
  const [cls] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, me.classId));
  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{cls.name}</p>
          <h1 className="text-2xl font-semibold">{me.name}</h1>
        </div>
        <LogoutButton />
      </header>
      <p className="text-muted-foreground">Відкритих тестів поки немає.</p>
    </>
  );
}
