"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, FormStatus } from "@/components/form-error";
import { ClassFields } from "./class-fields";
import { addStudentsState, createClassState, updateClassState } from "./actions";

type TeacherOption = { id: number; name: string };
type ClassValues = { name: string; grade: number; homeroomTeacherId: number | null };

export function CreateClassForm({ teachers }: { teachers: TeacherOption[] }) {
  const [state, action, pending] = useActionState(createClassState, undefined);
  const values: ClassValues | undefined = state?.values
    ? { name: state.values.name, grade: Number(state.values.grade) || 9, homeroomTeacherId: Number(state.values.homeroom) || null }
    : undefined;
  return (
    <form key={state?.at} action={action} className="grid gap-3">
      <ClassFields teachers={teachers} values={values} />
      <FormError>{state?.error}</FormError>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Створюю…" : "Створити клас"}
      </Button>
    </form>
  );
}

export function UpdateClassForm({ classId, teachers, values: initial }: { classId: number; teachers: TeacherOption[]; values: ClassValues }) {
  const [state, action, pending] = useActionState(updateClassState, undefined);
  const values: ClassValues = state?.values
    ? { name: state.values.name, grade: Number(state.values.grade) || initial.grade, homeroomTeacherId: Number(state.values.homeroom) || null }
    : initial;
  return (
    <form key={state?.at} action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="class" value={classId} />
      <ClassFields teachers={teachers} values={values} />
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Зміни збережено.</FormStatus>}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Зберігаю…" : "Зберегти"}
      </Button>
    </form>
  );
}

export function AddStudentsForm({ classId }: { classId: number }) {
  const [state, action, pending] = useActionState(addStudentsState, undefined);
  return (
    <form key={state?.at} action={action} className="grid max-w-xl gap-2">
      <input type="hidden" name="class" value={classId} />
      <label htmlFor="names" className="text-sm font-medium">
        Додати учнів: прізвище та ім’я, по одному в рядку
      </label>
      <textarea
        id="names"
        name="names"
        required
        rows={4}
        defaultValue={state?.ok ? "" : (state?.value ?? "")}
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
