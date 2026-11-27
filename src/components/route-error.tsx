"use client";
// The body every error.tsx renders: what failed, what still holds, how to recover. Graphite, not red (DESIGN.md).
import { useEffect, useTransition } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  error: unknown;
  retry: () => void;
  title: string;
  children: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

export function RouteError({ error, retry, title, children, back, className }: Props) {
  const [pending, start] = useTransition();
  useEffect(() => console.error(error), [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div role="alert" className={cn("grid max-w-md gap-3", className)}>
      <CircleAlert className="size-6 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <div className="grid gap-2 text-pretty text-muted-foreground">{children}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button className="h-12 px-6 text-base" disabled={pending} onClick={() => start(() => retry())}>
          {pending ? "Пробую ще раз…" : "Спробувати ще раз"}
        </Button>
        {back && (
          <Button asChild variant="outline" className="h-12 px-6 text-base">
            <Link href={back.href}>{back.label}</Link>
          </Button>
        )}
      </div>
      {digest && <p className="text-xs text-muted-foreground tabular-nums">Код помилки: {digest}</p>}
    </div>
  );
}
