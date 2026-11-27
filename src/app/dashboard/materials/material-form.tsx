"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/form-error";
import { saveMaterial } from "./actions";
import { MATERIAL_TYPES, TYPE_LABEL } from "./types";

type Values = { id?: number; title: string; url: string; type: string; subjectId: number; grade: number | null; topic: string };

export function MaterialForm({ values, subjects }: { values?: Values; subjects: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveMaterial, undefined);
  // After a refused save, show what was typed rather than the stored values.
  const v = state?.values ?? { title: values?.title, url: values?.url, type: values?.type, subject: values?.subjectId?.toString(), grade: values?.grade?.toString(), topic: values?.topic };
  return (
    <form key={state?.at} action={action} className="grid max-w-xl gap-4">
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="title">Назва</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={v.title} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="url">Посилання</Label>
        <Input id="url" name="url" type="url" required placeholder="https://" defaultValue={v.url} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="type">Тип</Label>
          <Select id="type" name="type" required defaultValue={v.type ?? ""}>
            <option value="" disabled>
              Оберіть
            </option>
            {MATERIAL_TYPES.map(t => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Предмет</Label>
          <Select id="subject" name="subject" required defaultValue={v.subject ?? ""}>
            <option value="" disabled>
              Оберіть
            </option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="grade">Клас</Label>
          <Select id="grade" name="grade" defaultValue={v.grade ?? ""}>
            <option value="">Будь-який</option>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="topic">Тема</Label>
        <Input id="topic" name="topic" maxLength={200} defaultValue={v.topic} />
      </div>
      <FormError>{state?.error}</FormError>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Зберігаю…" : "Зберегти"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/materials">Скасувати</Link>
        </Button>
      </div>
    </form>
  );
}
