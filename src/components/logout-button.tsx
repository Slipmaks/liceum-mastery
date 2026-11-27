import { LogOut } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { logout } from "@/app/auth-actions";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <SubmitButton variant="ghost" pendingLabel="Виходжу…" className={className}>
        <LogOut aria-hidden />
        Вийти
      </SubmitButton>
    </form>
  );
}
