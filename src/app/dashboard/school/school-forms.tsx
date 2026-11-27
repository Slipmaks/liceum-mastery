"use client";

import { useActionState, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmForm } from "@/components/confirm-form";
import { FormError, FormStatus } from "@/components/form-error";
import { RANK_LABEL, type Rank } from "@/lib/staff-labels";
import { addSubjectState, archiveStaff, updateStaffState, type StaffFormState, type SubjectFormState } from "./actions";

export function StaffEditDialog({
  user,
  ranks,
}: {
  user: { id: number; name: string; title: string; rank: Rank };
  ranks: readonly Rank[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Змінити
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-card p-5 text-card-foreground outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1 text-left">
              <Dialog.Title className="text-base font-semibold">Редагувати працівника</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{user.name}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Закрити">
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <UpdateStaffForm userId={user.id} ranks={ranks} initial={{ name: user.name, title: user.title, rank: user.rank }} />
          <div className="border-t pt-3">
            <ConfirmForm
              action={archiveStaff}
              title="Архівувати працівника?"
              message={`Звільнити ${user.name}? Вхід буде закрито, класне керівництво знято, а тести й результати залишаться.`}
              confirmLabel="Звільнити"
              pendingLabel="Архівую…"
            >
              <input type="hidden" name="user" value={user.id} />
              <Button type="submit" variant="ghost" size="sm">
                Звільнити
              </Button>
            </ConfirmForm>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function UpdateStaffForm({
  userId,
  ranks,
  initial,
}: {
  userId: number;
  ranks: readonly Rank[];
  initial: { name: string; title: string; rank: Rank };
}) {
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title);
  const [rank, setRank] = useState<string>(initial.rank);

  const [state, action, pending] = useActionState(async (prev: StaffFormState, fd: FormData) => {
    const res = await updateStaffState(prev, fd);
    if (res?.values) {
      setName(res.values.name);
      setTitle(res.values.title);
      setRank(res.values.rank);
    }
    return res;
  }, undefined);

  const nameId = `staff-name-${userId}`;
  const titleId = `staff-title-${userId}`;
  const rankId = `staff-rank-${userId}`;

  return (
    <div className="grid gap-2">
      <form action={action} className="grid gap-3">
        <input type="hidden" name="user" value={userId} />
        <div className="grid gap-1.5">
          <Label htmlFor={nameId}>Ім’я</Label>
          <Input id={nameId} name="name" required maxLength={200} value={name} onChange={e => setName(e.target.value)} aria-invalid={Boolean(state?.error)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={titleId}>Посада</Label>
          <Input id={titleId} name="title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Наприклад: Учителька історії" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={rankId}>Права</Label>
          <Select id={rankId} name="rank" value={rank} onChange={e => setRank(e.target.value)}>
            {ranks.map(r => (
              <option key={r} value={r}>
                {RANK_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
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
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(async (prev: SubjectFormState, fd: FormData) => {
    const res = await addSubjectState(prev, fd);
    if (res?.ok) setName("");
    else if (res?.value !== undefined) setName(res.value);
    return res;
  }, undefined);

  return (
    <div className="grid max-w-md gap-2">
      <form action={action} className="flex gap-2">
        <Input
          name="name"
          required
          maxLength={100}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Новий предмет"
          className="w-64"
          aria-label="Новий предмет"
          aria-invalid={Boolean(state?.error)}
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
