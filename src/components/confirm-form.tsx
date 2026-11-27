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

type ConfirmFormProps = {
  action: (fd: FormData) => Promise<void>;
  message: string;
  title?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  variant?: "default" | "graphite" | "outline";
  className?: string;
  children: React.ReactNode;
};

/** A form that asks via an Exam Paper AlertDialog before an action with lasting consequences. */
export function ConfirmForm({
  action,
  message,
  title = "Підтвердіть дію",
  confirmLabel = "Підтвердити",
  pendingLabel = "Виконую…",
  variant = "graphite",
  className,
  children,
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={e => {
          e.preventDefault();
          if (!pending) setOpen(true);
        }}
      >
        {children}
      </form>
      <AlertDialog
        open={open}
        onOpenChange={next => {
          if (!pending) setOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              variant={variant}
              disabled={pending}
              onClick={e => {
                e.preventDefault();
                if (!formRef.current || pending) return;
                const fd = new FormData(formRef.current);
                startTransition(async () => {
                  await action(fd);
                  setOpen(false);
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
