import { Check, CircleAlert } from "lucide-react";

// Graphite, not red: red means "locked" only (DESIGN.md › The Status Means One Thing Rule).
export function FormError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex gap-2 rounded-md border border-input bg-muted p-3 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

// Graphite on paper, not green: green means "submitted" only (DESIGN.md › The Status Means One Thing Rule).
export function FormStatus({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
      <Check className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
