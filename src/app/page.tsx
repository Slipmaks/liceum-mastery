import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuickLogin } from "./quick-login";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-4">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Liceum Mastery</h1>
        <p className="text-muted-foreground">Тести у форматі НМТ</p>
      </header>
      <div className="grid gap-3">
        <Button asChild className="h-12 text-base">
          <Link href="/student/login">Я учень</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 text-base">
          <Link href="/login">Я вчитель</Link>
        </Button>
      </div>
      <QuickLogin />
    </main>
  );
}
