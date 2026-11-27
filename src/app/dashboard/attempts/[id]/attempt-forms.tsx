"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormStatus } from "@/components/form-error";
import { grantRetakeState, saveCommentState } from "../../actions";

export function CommentForm({ attemptId, defaultValue }: { attemptId: number; defaultValue: string }) {
  const [state, action, pending] = useActionState(saveCommentState, undefined);
  return (
    <div className="grid gap-2">
      <form key={state?.at} action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="attempt" value={attemptId} />
        <Input
          name="comment"
          maxLength={500}
          defaultValue={state?.value ?? defaultValue}
          placeholder="Наприклад: сповіщення на телефоні, перевірено"
          aria-label="Коментар до позначки «можливе списування»"
          className="min-w-64 flex-1"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Зберігаю…" : "Зберегти"}
        </Button>
      </form>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Коментар збережено.</FormStatus>}
    </div>
  );
}

export function RetakeForm({ attemptId }: { attemptId: number }) {
  const [state, action, pending] = useActionState(grantRetakeState, undefined);
  return (
    <div className="mt-2 grid gap-2">
      <form key={state?.at} action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="attempt" value={attemptId} />
        <Input
          name="reason"
          required
          maxLength={300}
          defaultValue={state?.value ?? ""}
          placeholder="Причина, наприклад: хворів, заблоковано помилково"
          aria-label="Причина повторної спроби"
          className="min-w-64 flex-1"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Надаю…" : "Дозволити повторну спробу"}
        </Button>
      </form>
      <FormError>{state?.error}</FormError>
      {state?.ok && <FormStatus>Повторну спробу дозволено.</FormStatus>}
    </div>
  );
}
