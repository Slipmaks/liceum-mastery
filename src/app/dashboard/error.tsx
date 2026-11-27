"use client";
// Inside the staff shell, so the sidebar stays and the teacher can go elsewhere.
import { RouteError } from "@/components/route-error";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <RouteError error={error} retry={retry} title="Не вдалося виконати дію" back={{ href: "/dashboard", label: "До тестів" }} className="py-6">
      <p>Сервер не відповів або відповів з помилкою. Зміни, які не встигли зберегтися, доведеться повторити.</p>
      <p>Спробуйте ще раз за кілька секунд.</p>
    </RouteError>
  );
}
