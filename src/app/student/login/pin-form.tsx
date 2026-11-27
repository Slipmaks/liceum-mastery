"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { loginStudent } from "../../auth-actions";

const pinProps = { inputMode: "numeric", pattern: "\\d{4}", maxLength: 4, autoComplete: "off", required: true, className: "h-12 text-base tracking-[0.5em] tabular-nums" } as const;

export function PinForm({ code, studentId, firstTime }: { code: string; studentId: number; firstTime: boolean }) {
  const [state, action, pending] = useActionState(loginStudent, undefined);
  const [showPin, setShowPin] = useState(false);
  const inputType = firstTime && showPin ? "text" : "password";
  const hasError = Boolean(state?.error);

  return (
    <form action={action} className="grid gap-4 rounded-lg border bg-card p-5">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="student" value={studentId} />
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="pin" className="text-base">
            {firstTime ? "Новий PIN" : "PIN"}
          </Label>
          {firstTime && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs text-muted-foreground"
              aria-pressed={showPin}
              onClick={() => setShowPin(v => !v)}
            >
              {showPin ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {showPin ? "Сховати" : "Показати"}
            </Button>
          )}
        </div>
        <Input
          id="pin"
          name="pin"
          type={inputType}
          autoFocus
          aria-invalid={hasError}
          aria-describedby={hasError ? "pin-error" : undefined}
          {...pinProps}
        />
        {!firstTime && <p className="text-sm text-muted-foreground">Забули PIN? Попросіть класного керівника скинути його.</p>}
      </div>
      {firstTime && (
        <div className="grid gap-2">
          <Label htmlFor="repeat" className="text-base">
            Повторіть PIN
          </Label>
          <Input
            id="repeat"
            name="repeat"
            type={inputType}
            aria-invalid={hasError}
            aria-describedby={hasError ? "pin-error" : undefined}
            {...pinProps}
          />
        </div>
      )}
      <FormError id="pin-error">{state?.error}</FormError>
      <Button type="submit" disabled={pending} className="h-12 text-base">
        {pending ? "Входжу…" : "Увійти"}
      </Button>
    </form>
  );
}
