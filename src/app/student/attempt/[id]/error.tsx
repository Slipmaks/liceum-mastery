"use client";
// Retrying mounts the test again, which the server counts as a reopen (PRODUCT.md › Anti-cheat): say so honestly.
import { RouteError } from "@/components/route-error";

export default function AttemptError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <RouteError error={error} retry={retry} title="Тест не вдалося показати">
        <p>Збережені відповіді нікуди не зникли, а час тесту йде далі.</p>
        <p>Натисніть «Спробувати ще раз». Якщо тест буде призупинено, попросіть вчителя дозволити продовжити.</p>
      </RouteError>
    </main>
  );
}
