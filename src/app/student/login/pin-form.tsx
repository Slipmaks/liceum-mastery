"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";
import { loginStudent } from "../../auth-actions";

const pinProps = { type: "password", inputMode: "numeric", pattern: "\\d{4}", maxLength: 4, autoComplete: "off", required: true, className: "h-12 text-base tracking-[0.5em]" } as const;

export function PinForm({ code, studentId, firstTime }: { code: string; studentId: number; firstTime: boolean }) {
  const [state, action, pending] = useActionState(loginStudent, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="student" value={studentId} />
      <div className="grid gap-2">
        <Label htmlFor="pin" className="text-base">
          {firstTime ? "Новий PIN" : "PIN"}
        </Label>
        <Input id="pin" name="pin" autoFocus {...pinProps} />
      </div>
      {firstTime && (
        <div className="grid gap-2">
          <Label htmlFor="repeat" className="text-base">
            Повторіть PIN
          </Label>
          <Input id="repeat" name="repeat" {...pinProps} />
        </div>
      )}
      <FormError>{state?.error}</FormError>
      <Button type="submit" disabled={pending} className="h-12 text-base">
        Увійти
      </Button>
    </form>
  );
}
