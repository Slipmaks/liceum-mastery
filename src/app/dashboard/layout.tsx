// Staff shell: a 240px sidebar from lg up (DESIGN.md › Layout). The session is read inside Suspense, not at the top.
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, schools } from "@/db/schema";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { isAdmin } from "@/lib/staff";
import { LogoutButton } from "@/components/logout-button";
import { Nav, type Section } from "./nav";

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
        <Suspense fallback={<Nav />}>
          <StaffNav />
        </Suspense>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4 text-sm">
          <Suspense>
            <Me />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Below lg the sidebar is hidden; the same sections sit in a top bar. */}
        <header className="flex items-center justify-between gap-2 border-b bg-sidebar px-2 py-1.5 lg:hidden">
          <Suspense fallback={<Nav className="flex-row flex-wrap px-0" />}>
            <StaffNav className="flex-row flex-wrap px-0" />
          </Suspense>
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

async function StaffNav({ className }: { className?: string }) {
  const me = await requireStaff();
  const [homeroom] = isAdmin(me) ? [] : await db.select({ id: classes.id }).from(classes).where(eq(classes.homeroomTeacherId, me.id)).limit(1);
  const sections: Section[] = isAdmin(me) ? ["classes", "school"] : homeroom ? ["classes"] : [];
  return <Nav className={className} sections={sections} />;
}

async function Me() {
  const me = await requireStaff();
  return (
    <>
      <Link href="/dashboard/profile" className="font-medium text-sidebar-accent-foreground underline-offset-4 hover:underline">
        {me.name}
      </Link>
      <p className="text-muted-foreground">{me.title}</p>
      <div className="-ml-2.5 mt-2">
        <LogoutButton />
      </div>
    </>
  );
}
