import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuickLogin } from "./quick-login";

const BRAND_CELLS = [true, false, true, false];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-4">
      <header className="grid gap-2">
        <div className="flex items-center gap-1" aria-hidden>
          {BRAND_CELLS.map((inked, i) => (
            <span
              key={i}
              className={
                inked
                  ? "h-4 w-3 rounded-[2px] border border-primary bg-primary"
                  : "h-4 w-3 rounded-[2px] border border-input bg-sheet"
              }
            />
          ))}
        </div>
        <h1 className="text-2xl font-semibold">Liceum Mastery</h1>
        <p className="text-muted-foreground">Тести у форматі НМТ для ліцеїв</p>
      </header>
      <div className="grid gap-3 rounded-lg border bg-card p-5">
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
