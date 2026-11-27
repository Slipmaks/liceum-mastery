"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

/** Submit button that reflects the enclosing `<form>` pending state (especially on cold starts). */
export function SubmitButton({ pendingLabel, disabled, children, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending || undefined} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
