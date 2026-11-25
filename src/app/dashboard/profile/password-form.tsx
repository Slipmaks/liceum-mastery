"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="current">Поточний пароль</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="next">Новий пароль, щонайменше 8 символів</Label>
        <Input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="repeat">Повторіть новий пароль</Label>
        <Input id="repeat" name="repeat" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <FormError>{state?.error}</FormError>
      {state?.ok && (
        <p role="status" className="text-sm">
          Пароль змінено. На інших пристроях потрібно буде увійти знову.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        Змінити пароль
      </Button>
    </form>
  );
}
