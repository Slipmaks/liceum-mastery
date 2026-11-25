"use client";
// Sidebar sections; the current one gets a muted grey fill, not ink (DESIGN.md › Navigation).
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Library } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Тести", icon: FileText },
  { href: "/dashboard/materials", label: "Матеріали", icon: Library },
];

/** With Cache Components the pathname is request data, so it streams in; until then the links show without a highlight. */
export function Nav({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Links className={className} />}>
      <Current className={className} />
    </Suspense>
  );
}

function Current({ className }: { className?: string }) {
  const path = usePathname();
  // Everything under /dashboard that isn't another section is about tests.
  const current = NAV.findLast(n => path === n.href || path.startsWith(`${n.href}/`))?.href;
  return <Links className={className} current={current} />;
}

function Links({ className, current }: { className?: string; current?: string }) {
  return (
    <nav aria-label="Розділи" className={cn("flex flex-col gap-0.5 px-3", className)}>
      {NAV.map(({ href, label, icon: Icon }) => (
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
