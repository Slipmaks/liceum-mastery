"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmForm } from "@/components/confirm-form";
import { FormError } from "@/components/form-error";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { studentsLabel } from "@/lib/format";
import { openTest } from "../../actions";

/** Switching the class reloads the roster at once, so the list shown and the class opened never disagree. */
export function ClassPicker({ testId, classes, value }: { testId: number; classes: { id: number; name: string }[]; value: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="grid w-fit gap-1.5 text-sm">
      Клас
      <Select
        name="class"
        defaultValue={value}
        aria-busy={pending || undefined}
        onChange={e => start(() => router.replace(`/dashboard/tests/${testId}?class=${e.target.value}`, { scroll: false }))}
        className="min-w-40"
      >
        <option value="" disabled>
          Оберіть клас
        </option>
        {classes.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {pending && <span className="text-muted-foreground">Завантажую список учнів…</span>}
    </label>
  );
}

type Props = {
  testId: number;
  classId: number;
  classTitle: string;
  roster: { id: number; name: string }[];
  empty: boolean;
  isDraft: boolean;
};

export function OpenFormClient({ testId, classId, classTitle, roster, empty, isDraft }: Props) {
  const [whole, setWhole] = useState(!empty);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [clientError, setClientError] = useState<string | undefined>(empty ? "Оберіть хоча б одного учня або весь клас." : undefined);

  const toggleStudent = (id: number, checked: boolean) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    if (checked) setClientError(undefined);
  };

  const valid = () => {
    if (whole || picked.size > 0) {
      setClientError(undefined);
      return true;
    }
    setClientError("Оберіть хоча б одного учня або весь клас.");
    return false;
  };

  // Nominative throughout, so no case agreement after a preposition is needed.
  const who = whole ? `${classTitle}: увесь клас, ${studentsLabel(roster.length)}.` : `${classTitle}: обрано ${studentsLabel(picked.size)} з ${roster.length}.`;
  const label = `Відкрити для ${classTitle}`;

  const fields = (
    <>
      <input type="hidden" name="test" value={testId} />
      <input type="hidden" name="class" value={classId} />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="whole"
          checked={whole}
          onChange={e => {
            setWhole(e.target.checked);
            if (e.target.checked) setClientError(undefined);
          }}
          className="size-4 accent-foreground"
        />
        Увесь клас ({studentsLabel(roster.length)}), разом з учнями, які приєднаються пізніше
      </label>
      {!whole && (
        <fieldset className="grid gap-1 sm:grid-cols-2">
          <legend className="mb-1 text-sm text-muted-foreground">Оберіть учнів (наприклад, тих, хто був відсутній):</legend>
          {roster.map(s => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="student"
                value={s.id}
                checked={picked.has(s.id)}
                onChange={e => toggleStudent(s.id, e.target.checked)}
                className="size-4 accent-foreground"
              />
              {s.name}
            </label>
          ))}
        </fieldset>
      )}
      <FormError>{clientError}</FormError>
    </>
  );

  if (isDraft) {
    return (
      <ConfirmForm
        action={openTest}
        variant="default"
        className="grid gap-3 border-t pt-3"
        title={`Відкрити тест для ${classTitle}?`}
        message={`${who} Після першого відкриття тест не можна буде змінити — редагувати можна лише копію.`}
        confirmLabel={label}
        pendingLabel="Відкриваю…"
        onBeforeOpen={valid}
      >
        {fields}
        <Button type="submit" className="w-fit">
          {label}
        </Button>
      </ConfirmForm>
    );
  }

  return (
    <ActionForm
      action={openTest}
      onSubmit={e => {
        if (!valid()) e.preventDefault();
      }}
      className="justify-items-stretch gap-3 border-t pt-3"
    >
      {fields}
      <SubmitButton className="w-fit" pendingLabel="Відкриваю…">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}
