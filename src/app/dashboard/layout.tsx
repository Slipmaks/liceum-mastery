// Staff shell: a 240px sidebar from lg up (DESIGN.md › Layout). The session is read inside Suspense, not at the top.
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Nav } from "./nav";

export default function StaffLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 pt-5 pb-6">
          <p className="font-semibold text-sidebar-accent-foreground">Liceum Mastery</p>
          <Suspense>
            <School />
          </Suspense>
        </div>
        <Nav />
        <div className="mt-auto border-t border-sidebar-border px-5 py-4 text-sm">
          <Suspense>
            <Me />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Below lg the sidebar is hidden; the same sections sit in a top bar. */}
        <header className="flex items-center justify-between gap-2 border-b bg-sidebar px-2 py-1.5 lg:hidden">
          <Nav className="flex-row px-0" />
          <LogoutButton />
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

async function School() {
  const me = await requireStaff();
  const [s] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, me.schoolId));
  return <p className="text-sm text-muted-foreground">{s.name}</p>;
}

async function Me() {
  const me = await requireStaff();
  return (
    <>
      <p className="font-medium text-sidebar-accent-foreground">{me.name}</p>
      <p className="text-muted-foreground">{me.title}</p>
      <div className="-ml-2.5 mt-2">
        <LogoutButton />
      </div>
    </>
  );
}
