"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { quickLogin } from "./auth-actions";

const STAFF_ROLES = [
  ["director", "Директор"],
  ["deputy", "Завуч"],
  ["homeroom", "Класний керівник 9-А"],
  ["teacher", "Вчитель"],
] as const;

export function QuickLogin() {
  const [state, action, pending] = useActionState(quickLogin, undefined);
  return (
    <section className="grid gap-3 border-t pt-6">
      <h2 className="text-sm font-medium">Демо: швидкий вхід у Ліцей № 1</h2>
      <form action={action} className="grid grid-cols-2 gap-2">
        {STAFF_ROLES.map(([role, label]) => (
          <Button key={role} name="role" value={role} variant="secondary" disabled={pending} className="h-auto min-h-10 whitespace-normal">
            {label}
          </Button>
        ))}
        <Button name="role" value="student" variant="secondary" disabled={pending} className="col-span-2 h-auto min-h-12 whitespace-normal text-base">
          Учень 9-А · Бондаренко Аліна
        </Button>
      </form>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Входжу в демо-акаунт…
        </p>
      )}
      <FormError>{state?.error}</FormError>
    </section>
  );
}
