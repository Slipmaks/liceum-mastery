// Staff shell: a 240px sidebar from lg up (DESIGN.md › Layout). The session is read inside Suspense, not at the top.
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { User } from "lucide-react";
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
            <School className="text-sm text-muted-foreground" />
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
        {/* Below lg the sidebar is hidden; show school, profile link, logout, and section tabs. */}
        <header className="border-b bg-sidebar lg:hidden">
          <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-3 py-2">
            <div className="min-w-0">
              <p className="font-semibold leading-tight text-sidebar-accent-foreground">Liceum Mastery</p>
              <Suspense>
                <School className="truncate text-xs text-muted-foreground" />
              </Suspense>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Suspense>
                <MobileMe />
              </Suspense>
              <LogoutButton />
            </div>
          </div>
          <div className="px-1 py-1.5">
            <Suspense fallback={<Nav className="flex-row flex-wrap px-0" />}>
              <StaffNav className="flex-row flex-wrap px-0" />
            </Suspense>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

async function School({ className }: { className?: string }) {
  const me = await requireStaff();
  const [s] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, me.schoolId));
  return <p className={className}>{s.name}</p>;
}

async function StaffNav({ className }: { className?: string }) {
  const me = await requireStaff();
  const [homeroom] = isAdmin(me) ? [] : await db.select({ id: classes.id }).from(classes).where(eq(classes.homeroomTeacherId, me.id)).limit(1);
  const sections: Section[] = isAdmin(me) ? ["classes", "school"] : homeroom ? ["classes"] : [];
  return <Nav className={className} sections={sections} />;
}

async function MobileMe() {
  const me = await requireStaff();
  return (
    <Link
      href="/dashboard/profile"
      title={me.title ? `${me.name} · ${me.title}` : me.name}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-sidebar-accent-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
    >
      <User className="size-4 shrink-0" aria-hidden />
      <span className="max-w-28 truncate sm:max-w-44">{me.name}</span>
    </Link>
  );
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
