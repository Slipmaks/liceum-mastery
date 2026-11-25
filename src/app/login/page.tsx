"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { loginStaff } from "../auth-actions";

export default function StaffLogin() {
  const [state, action, pending] = useActionState(loginStaff, undefined);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Вхід для вчителя</h1>
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus defaultValue={state?.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <FormError>{state?.error}</FormError>
        <Button type="submit" disabled={pending}>
          Увійти
        </Button>
      </form>
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        На головну
      </Link>
    </main>
  );
}
