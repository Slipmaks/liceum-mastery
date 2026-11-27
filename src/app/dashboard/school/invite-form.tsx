"use client";
import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/form-error";
import { RANK_LABEL } from "@/lib/staff-labels";
import { inviteStaff } from "./actions";

export function InviteForm({ ranks }: { ranks: ("deputy" | "teacher")[] }) {
  const [state, action, pending] = useActionState(inviteStaff, undefined);
  const link = state && "token" in state ? `${location.origin}/invite/${state.token}` : null;

  return (
    <div className="grid gap-3">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" required className="w-64" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="invite-rank">Права</Label>
          <Select id="invite-rank" name="rank" defaultValue="teacher">
            {ranks.map(r => (
              <option key={r} value={r}>
                {RANK_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Створюю…" : "Створити посилання"}
        </Button>
      </form>
      <FormError>{state && "error" in state ? state.error : undefined}</FormError>
      {link && state && "email" in state && <LinkBox key={link} link={link} email={state.email} />}
    </div>
  );
}

function LinkBox({ link, email }: { link: string; email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-lg border bg-card p-3 text-sm">
      <p>
        Посилання для <span className="font-medium">{email}</span> діє 7 днів. Надішліть його у Viber або Telegram: воно показується лише зараз.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={e => e.target.select()} className="font-mono text-xs" aria-label="Посилання-запрошення" />
        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Скопійовано" : "Копіювати"}
        </Button>
      </div>
    </div>
  );
}
