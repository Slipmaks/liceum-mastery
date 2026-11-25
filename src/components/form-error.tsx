import { CircleAlert } from "lucide-react";

// Graphite, not red: red means "locked" only (DESIGN.md › The Status Means One Thing Rule).
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex gap-2 rounded-md bg-muted p-3 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
