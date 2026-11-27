"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormError } from "@/components/form-error";
import type { ActionResult } from "@/components/action-form";

type ConfirmFormProps = {
  action: (fd: FormData) => Promise<ActionResult>;
  message: string;
  title?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  variant?: "default" | "graphite" | "outline";
  className?: string;
  onBeforeOpen?: (form: HTMLFormElement) => boolean;
  children: React.ReactNode;
};

function isNextNavigationError(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("digest" in err)) return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

/** A form that asks via an Exam Paper AlertDialog before an action with lasting consequences. */
export function ConfirmForm({
  action,
  message,
  title = "Підтвердіть дію",
  confirmLabel = "Підтвердити",
  pendingLabel = "Виконую…",
  variant = "graphite",
  className,
  onBeforeOpen,
  children,
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <form
        ref={formRef}
        action={async fd => void (await action(fd))}
        className={className}
        onSubmit={e => {
          e.preventDefault();
          if (pending) return;
          if (onBeforeOpen && !onBeforeOpen(e.currentTarget)) return;
          setError(null);
          setOpen(true);
        }}
      >
        {children}
      </form>
      <AlertDialog
        open={open}
        onOpenChange={next => {
          if (!pending) {
            if (!next) setError(null);
            setOpen(next);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <FormError>{error}</FormError>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              variant={variant}
              disabled={pending}
              onClick={e => {
                e.preventDefault();
                if (!formRef.current || pending) return;
                const fd = new FormData(formRef.current);
                setError(null);
                startTransition(async () => {
                  try {
                    const r = await action(fd);
                    if (r?.error) setError(r.error);
                    else setOpen(false);
                  } catch (err) {
                    if (isNextNavigationError(err)) throw err;
                    setError("Не вдалося виконати дію. Перевірте з’єднання та спробуйте ще раз.");
                  }
                });
              }}
            >
              {pending ? pendingLabel : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Client-state confirmation dialog (no server action). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
