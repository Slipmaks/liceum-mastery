"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormStatus } from "@/components/form-error";
import { grantRetakeState, saveCommentState, type AttemptActionState } from "../../actions";

export function CommentForm({ attemptId, defaultValue }: { attemptId: number; defaultValue: string }) {
  const [comment, setComment] = useState(defaultValue);
  const [state, action, pending] = useActionState(async (prev: AttemptActionState, fd: FormData) => {
    const res = await saveCommentState(prev, fd);
    if (res?.value !== undefined) setComment(res.value);
    return res;
  }, undefined);

  return (
    <div className="grid gap-2">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="attempt" value={attemptId} />
        <Input
          name="comment"
          maxLength={500}
          value={comment}
          onChange={e => setComment(e.target.value)}
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
  const [reason, setReason] = useState("");
  const [state, action, pending] = useActionState(async (prev: AttemptActionState, fd: FormData) => {
    const res = await grantRetakeState(prev, fd);
    if (res?.ok) setReason("");
    else if (res?.value !== undefined) setReason(res.value);
    return res;
  }, undefined);

  return (
    <div className="mt-2 grid gap-2">
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="attempt" value={attemptId} />
        <Input
          name="reason"
          required
          maxLength={300}
          value={reason}
          onChange={e => setReason(e.target.value)}
          aria-invalid={Boolean(state?.error)}
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
