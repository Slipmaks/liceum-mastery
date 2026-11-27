"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { studentsLabel } from "@/lib/format";
import { openTest } from "../../actions";

type Props = {
  testId: number;
  classId: number;
  roster: { id: number; name: string }[];
  empty: boolean;
  isDraft: boolean;
};

export function OpenFormClient({ testId, classId, roster, empty, isDraft }: Props) {
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
        title="Відкрити й зафіксувати тест?"
        message="Після першого відкриття тест не можна буде змінити — редагувати можна лише копію."
        confirmLabel="Відкрити тест"
        pendingLabel="Відкриваю…"
        onBeforeOpen={valid}
      >
        {fields}
        <Button type="submit" className="w-fit">
          Відкрити тест
        </Button>
      </ConfirmForm>
    );
  }

  return (
    <form
      action={openTest}
      onSubmit={e => {
        if (!valid()) e.preventDefault();
      }}
      className="grid gap-3 border-t pt-3"
    >
      {fields}
      <SubmitButton className="w-fit" pendingLabel="Відкриваю…">
        Відкрити тест
      </SubmitButton>
    </form>
  );
}
