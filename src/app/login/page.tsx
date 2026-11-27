import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вхід для вчителя" };

export default function StaffLogin() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">Вхід для вчителя</h1>
      <LoginForm />
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        На головну
      </Link>
    </main>
  );
}
