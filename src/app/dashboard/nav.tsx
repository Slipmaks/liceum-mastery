"use client";
// Sidebar sections; the current one gets a muted grey fill, not ink (DESIGN.md › Navigation).
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Library, School, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type Section = "classes" | "school";
const NAV = [
  { href: "/dashboard", label: "Тести", icon: FileText },
  { href: "/dashboard/classes", label: "Класи", icon: Users, only: "classes" },
  { href: "/dashboard/materials", label: "Матеріали", icon: Library },
  { href: "/dashboard/school", label: "Школа", icon: School, only: "school" },
] as const;

/**
 * `sections`: the role-dependent sections this user may open (classes: admins and homeroom teachers; school: admins).
 * With Cache Components the pathname is request data, so it streams in; until then the links show without a highlight.
 */
export function Nav({ className, sections = [] }: { className?: string; sections?: Section[] }) {
  const props = { className, sections };
  return (
    <Suspense fallback={<Links {...props} />}>
      <Current {...props} />
    </Suspense>
  );
}

function Current(props: { className?: string; sections: Section[] }) {
  const path = usePathname();
  // Everything under /dashboard except /profile or another named section is about tests.
  const current =
    path === "/dashboard/profile" || path.startsWith("/dashboard/profile/")
      ? undefined
      : NAV.findLast(n => path === n.href || path.startsWith(`${n.href}/`))?.href;
  return <Links {...props} current={current} />;
}

function Links({ className, sections, current }: { className?: string; sections: Section[]; current?: string }) {
  return (
    <nav aria-label="Розділи" className={cn("flex flex-col gap-0.5 px-3", className)}>
      {NAV.filter(n => !("only" in n) || sections.includes(n.only)).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/60",
            current === href && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
