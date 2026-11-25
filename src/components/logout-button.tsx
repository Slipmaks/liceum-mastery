import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth-actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost">
        <LogOut aria-hidden />
        Вийти
      </Button>
    </form>
  );
}
