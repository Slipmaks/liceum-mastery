// Staff shell: a 240px sidebar from lg up (DESIGN.md › Layout). The session is read inside Suspense, not at the top.
import { Suspense } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

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
        <nav aria-label="Розділи" className="flex flex-col gap-0.5 px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
          >
            <FileText className="size-4" aria-hidden />
            Тести
          </Link>
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4 text-sm">
          <Suspense>
            <Me />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
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
