"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormStatus } from "@/components/form-error";
import { updateProfile } from "./actions";

export function ProfileForm({ email, rankLabel, initial }: { email: string; rankLabel: string; initial: { name: string; title: string } }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const v = state?.values ?? initial;
  return (
    <form key={state?.at} action={action} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {email} · {rankLabel}
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Ім’я</Label>
        <Input id="name" name="name" required maxLength={200} defaultValue={v.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="title">Посада</Label>
        <Input id="title" name="title" maxLength={200} defaultValue={v.title} placeholder="Наприклад: Учителька історії" />
      </div>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Профіль збережено.</FormStatus>}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Зберігаю…" : "Зберегти"}
      </Button>
    </form>
  );
}
