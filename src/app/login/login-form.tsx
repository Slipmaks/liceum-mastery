"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { loginStaff } from "../auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginStaff, undefined);
  const hasError = Boolean(state?.error);
  return (
    <form action={action} className="grid gap-4 rounded-lg border bg-card p-5">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state?.email}
          aria-invalid={hasError}
          aria-describedby={hasError ? "login-error" : undefined}
          className="h-11 sm:h-9"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={hasError}
          aria-describedby={hasError ? "login-error" : undefined}
          className="h-11 sm:h-9"
        />
      </div>
      <FormError id="login-error">{state?.error}</FormError>
      <Button type="submit" disabled={pending} className="h-11 sm:h-9">
        {pending ? "Входжу…" : "Увійти"}
      </Button>
      <p className="text-sm text-muted-foreground">Забули пароль? Зверніться до директора або заступника школи.</p>
    </form>
  );
}
