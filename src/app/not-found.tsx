import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Сторінку не знайдено" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 p-4">
      <h1 className="text-2xl font-semibold">Сторінку не знайдено</h1>
      <p className="text-pretty text-muted-foreground">Посилання застаріло або в адресі помилка.</p>
      <Button asChild variant="outline" className="mt-2 h-12 w-fit px-6 text-base">
        <Link href="/">На головну</Link>
      </Button>
    </main>
  );
}
