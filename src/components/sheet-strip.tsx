import { cn } from "@/lib/utils";

/** The answer-sheet strip: one cell per question, inked when answered. Shared by the student header and the teacher monitor. */
export function SheetStrip({
  answered,
  current,
  numbered,
  className,
  cellClassName,
}: {
  answered: boolean[];
  current?: number;
  /** Print question numbers in the cells (student header). */
  numbered?: boolean;
  className?: string;
  cellClassName?: string;
}) {
  const count = answered.filter(Boolean).length;
  return (
    <div
      role="img"
      aria-label={`Відповіді: ${count} з ${answered.length}`}
      className={cn("flex gap-0.5", className)}
    >
      {answered.map((done, i) => (
        <span
          key={i}
          className={cn(
            "grid h-3.5 w-2.5 place-items-center rounded-[2px] border text-xs leading-none font-semibold tabular-nums",
            done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-sheet text-foreground/75",
            i === current && "outline-2 outline-offset-1 outline-primary",
            cellClassName,
          )}
        >
          {numbered && i + 1}
        </span>
      ))}
    </div>
  );
}
