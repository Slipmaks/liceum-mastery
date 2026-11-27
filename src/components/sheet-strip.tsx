"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type CellState = "empty" | "partial" | "done";

/** The answer-sheet strip: one cell per question, inked when answered. Shared by the student header and the teacher monitor. */
export function SheetStrip({
  answered,
  states,
  current,
  numbered,
  onSelect,
  className,
  cellClassName,
}: {
  answered?: boolean[];
  states?: CellState[];
  current?: number;
  /** Print question numbers in the cells (student header). */
  numbered?: boolean;
  /** When provided, cells act as navigation buttons and auto-scroll the active cell into view. */
  onSelect?: (index: number) => void;
  className?: string;
  cellClassName?: string;
}) {
  const list: CellState[] = states ?? (answered ?? []).map(d => (d ? "done" : "empty"));
  const doneCount = list.filter(s => s === "done").length;
  const partialCount = list.filter(s => s === "partial").length;
  const label = partialCount > 0 ? `Відповіді: ${doneCount} з ${list.length}, частково: ${partialCount}` : `Відповіді: ${doneCount} з ${list.length}`;

  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (onSelect) activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current, onSelect]);

  const compactMonitor = !onSelect && !numbered && list.length > 14;
  const cellClasses = (state: CellState, i: number) =>
    cn(
      "relative grid h-3.5 w-2.5 shrink-0 place-items-center rounded-[2px] border text-xs leading-none font-semibold tabular-nums",
      compactMonitor && "w-2",
      state === "done"
        ? "border-primary bg-primary text-primary-foreground"
        : state === "partial"
          ? cn(
              "border-primary bg-accent text-accent-foreground after:pointer-events-none after:absolute after:right-0.5 after:bottom-0.5 after:rounded-full after:bg-primary",
              numbered ? "after:size-1.5" : "after:size-1",
            )
          : "border-input bg-sheet text-foreground/75",
      i === current && "outline-2 outline-offset-1 outline-primary",
      onSelect && i !== current && "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      onSelect && "cursor-pointer",
      cellClassName,
    );

  if (onSelect) {
    return (
      <div
        role="group"
        aria-label={label}
        className={cn("-m-0.5 flex gap-0.5 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      >
        {list.map((state, i) => (
          <button
            key={i}
            ref={i === current ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Питання ${i + 1}${state === "done" ? ", є відповідь" : state === "partial" ? ", відповідь часткова" : ", без відповіді"}`}
            className={cellClasses(state, i)}
          >
            {numbered && i + 1}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="img" aria-label={label} className={cn("flex flex-nowrap gap-0.5", className)}>
      {list.map((state, i) => (
        <span key={i} className={cellClasses(state, i)}>
          {numbered && i + 1}
        </span>
      ))}
    </div>
  );
}
