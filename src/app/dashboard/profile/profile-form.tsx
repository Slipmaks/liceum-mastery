"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormStatus } from "@/components/form-error";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ email, rankLabel, initial }: { email: string; rankLabel: string; initial: { name: string; title: string } }) {
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title);

  const [state, action, pending] = useActionState(async (prev: ProfileState, fd: FormData) => {
    const res = await updateProfile(prev, fd);
    if (res?.values) {
      setName(res.values.name);
      setTitle(res.values.title);
    }
    return res;
  }, undefined);

  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {email} · {rankLabel}
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Ім’я</Label>
        <Input id="name" name="name" required maxLength={200} value={name} onChange={e => setName(e.target.value)} aria-invalid={Boolean(state?.error)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="title">Посада</Label>
        <Input id="title" name="title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Наприклад: Учителька історії" />
      </div>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Профіль збережено.</FormStatus>}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Зберігаю…" : "Зберегти"}
      </Button>
    </form>
  );
}
