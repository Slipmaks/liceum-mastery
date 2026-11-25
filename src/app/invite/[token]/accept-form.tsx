"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { acceptInvite } from "../../auth-actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="name">Прізвище, ім’я та по батькові</Label>
        <Input id="name" name="name" required maxLength={200} autoComplete="name" autoFocus />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Пароль, щонайменше 8 символів</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="repeat">Повторіть пароль</Label>
        <Input id="repeat" name="repeat" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <FormError>{state?.error}</FormError>
      <Button type="submit" disabled={pending}>
        Створити обліковий запис
      </Button>
    </form>
  );
}
