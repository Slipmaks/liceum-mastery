"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormError, FormStatus } from "@/components/form-error";
import { RANK_LABEL, type Rank } from "@/lib/staff-labels";
import { addSubjectState, updateStaffState } from "./actions";

export function UpdateStaffForm({
  userId,
  ranks,
  initial,
}: {
  userId: number;
  ranks: readonly Rank[];
  initial: { name: string; title: string; rank: Rank };
}) {
  const [state, action, pending] = useActionState(updateStaffState, undefined);
  const v = state?.values ?? initial;
  return (
    <div className="grid gap-2">
      <form key={state?.at} action={action} className="grid gap-2">
        <input type="hidden" name="user" value={userId} />
        <Input name="name" required maxLength={200} defaultValue={v.name} aria-label="Ім’я" />
        <Input name="title" maxLength={200} defaultValue={v.title} placeholder="Посада, напр. Учителька історії" aria-label="Посада" />
        <Select name="rank" defaultValue={v.rank} aria-label="Права">
          {ranks.map(r => (
            <option key={r} value={r}>
              {RANK_LABEL[r]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-fit">
          {pending ? "Зберігаю…" : "Зберегти"}
        </Button>
      </form>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Збережено.</FormStatus>}
    </div>
  );
}

export function AddSubjectForm() {
  const [state, action, pending] = useActionState(addSubjectState, undefined);
  return (
    <div className="grid max-w-md gap-2">
      <form key={state?.at} action={action} className="flex gap-2">
        <Input
          name="name"
          required
          maxLength={100}
          defaultValue={state?.ok ? "" : (state?.value ?? "")}
          placeholder="Новий предмет"
          className="w-64"
          aria-label="Новий предмет"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Додаю…" : "Додати"}
        </Button>
      </form>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Предмет додано.</FormStatus>}
    </div>
  );
}
