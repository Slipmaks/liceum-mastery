"use client";
import { RouteError } from "@/components/route-error";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <RouteError error={error} retry={retry} title="Сторінка не відкрилася" back={{ href: "/", label: "На головну" }}>
        <p>Сервер не відповів. Спробуйте ще раз за кілька секунд.</p>
      </RouteError>
    </main>
  );
}
