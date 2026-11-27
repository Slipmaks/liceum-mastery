"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, FormStatus } from "@/components/form-error";
import { ClassFields } from "./class-fields";
import { addStudentsState, createClassState, updateClassState, type AddStudentsState, type CreateClassState, type UpdateClassState } from "./actions";

type TeacherOption = { id: number; name: string };
type ClassValues = { name: string; grade: number; homeroomTeacherId: number | null };

export function CreateClassForm({ teachers }: { teachers: TeacherOption[] }) {
  const [fields, setFields] = useState({ name: "", grade: "9", homeroom: "" });
  const [state, action, pending] = useActionState(async (prev: CreateClassState, fd: FormData) => {
    const res = await createClassState(prev, fd);
    if (res?.values) setFields(res.values);
    return res;
  }, undefined);

  return (
    <form action={action} className="grid gap-3">
      <ClassFields
        teachers={teachers}
        controlled={{
          ...fields,
          onChange: patch => setFields(prev => ({ ...prev, ...patch })),
        }}
        error={Boolean(state?.error)}
      />
      <FormError>{state?.error}</FormError>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Створюю…" : "Створити клас"}
      </Button>
    </form>
  );
}

export function UpdateClassForm({ classId, teachers, values: initial }: { classId: number; teachers: TeacherOption[]; values: ClassValues }) {
  const [fields, setFields] = useState({
    name: initial.name,
    grade: String(initial.grade),
    homeroom: initial.homeroomTeacherId ? String(initial.homeroomTeacherId) : "",
  });
  const [state, action, pending] = useActionState(async (prev: UpdateClassState, fd: FormData) => {
    const res = await updateClassState(prev, fd);
    if (res?.values) setFields(res.values);
    return res;
  }, undefined);

  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="class" value={classId} />
      <ClassFields
        teachers={teachers}
        controlled={{
          ...fields,
          onChange: patch => setFields(prev => ({ ...prev, ...patch })),
        }}
        error={Boolean(state?.error)}
      />
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Зміни збережено.</FormStatus>}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Зберігаю…" : "Зберегти"}
      </Button>
    </form>
  );
}

export function AddStudentsForm({ classId }: { classId: number }) {
  const [names, setNames] = useState("");
  const [state, action, pending] = useActionState(async (prev: AddStudentsState, fd: FormData) => {
    const res = await addStudentsState(prev, fd);
    if (res?.ok) setNames("");
    else if (res?.value !== undefined) setNames(res.value);
    return res;
  }, undefined);

  return (
    <form action={action} className="grid max-w-xl gap-2">
      <input type="hidden" name="class" value={classId} />
      <label htmlFor="names" className="text-sm font-medium">
        Додати учнів: прізвище та ім’я, по одному в рядку
      </label>
      <textarea
        id="names"
        name="names"
        required
        rows={4}
        value={names}
        onChange={e => setNames(e.target.value)}
        aria-invalid={Boolean(state?.error)}
        placeholder={"Бондаренко Аліна\nВасильченко Максим"}
        className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>{state.message}</FormStatus>}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Додаю…" : "Додати"}
      </Button>
    </form>
  );
}
