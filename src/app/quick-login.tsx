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
    <details className="border-t pt-5">
      <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground hover:text-foreground">
        Демо-вхід: Ліцей № 1
      </summary>
      <div className="mt-3 grid gap-3">
        <form action={action} className="grid grid-cols-2 gap-2">
          {STAFF_ROLES.map(([role, label]) => (
            <Button key={role} name="role" value={role} variant="secondary" disabled={pending} className="h-auto min-h-10 whitespace-normal text-sm">
              {label}
            </Button>
          ))}
          <Button name="role" value="student" variant="secondary" disabled={pending} className="col-span-2 h-auto min-h-10 whitespace-normal text-sm">
            Учень 9-А · Бондаренко Аліна
          </Button>
        </form>
        {pending && (
          <p role="status" className="text-sm text-muted-foreground">
            Входжу в демо-акаунт…
          </p>
        )}
        <FormError>{state?.error}</FormError>
      </div>
    </details>
  );
}
