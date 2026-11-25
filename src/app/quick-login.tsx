"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { quickLogin } from "./auth-actions";

const ROLES = [
  ["director", "Директор"],
  ["deputy", "Завуч"],
  ["homeroom", "Класний керівник 9-А"],
  ["teacher", "Вчитель"],
  ["student", "Учень 9-А"],
];

export function QuickLogin() {
  const [state, action, pending] = useActionState(quickLogin, undefined);
  return (
    <section className="grid gap-3 border-t pt-6">
      <h2 className="text-sm font-medium">Демо: швидкий вхід у Ліцей № 1</h2>
      <form action={action} className="grid grid-cols-2 gap-2">
        {ROLES.map(([role, label]) => (
          <Button key={role} name="role" value={role} variant="secondary" disabled={pending} className="h-auto min-h-10 whitespace-normal">
            {label}
          </Button>
        ))}
      </form>
      <FormError>{state?.error}</FormError>
    </section>
  );
}
