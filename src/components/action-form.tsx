"use client";
// A plain server-action form that reports failure in place instead of replacing the page with error.tsx:
// a lost connection, or a refusal the action returns as { error }. Graphite, not red (DESIGN.md).
import { useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionResult = { error: string } | void;

type Props = Omit<React.ComponentProps<"form">, "action"> & {
  action: (fd: FormData) => Promise<ActionResult>;
};

export function ActionForm({ action, className, children, ...props }: Props) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      {...props}
      className={cn("grid justify-items-start gap-1.5", className)}
      action={async fd => {
        setError(null);
        try {
          const r = await action(fd);
          if (r?.error) setError(r.error);
        } catch (e) {
          unstable_rethrow(e);
          setError("Не вдалося — перевірте з’єднання і спробуйте ще раз.");
        }
      }}
    >
      {children}
      {error && (
        <p role="alert" className="flex max-w-xs gap-1.5 text-sm text-pretty text-foreground">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          {error}
        </p>
      )}
    </form>
  );
}
