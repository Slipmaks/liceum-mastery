"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

type RosterStudent = { id: number; name: string };

/** Pick a student from the class roster; adds instant search when the list exceeds 8 names. */
export function RosterPicker({ code, roster }: { code: string; roster: RosterStudent[] }) {
  const [query, setQuery] = useState("");

  if (roster.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        У цьому класі ще немає учнів. Зверніться до класного керівника.
      </p>
    );
  }

  const needle = query.trim().toLocaleLowerCase("uk");
  const visible = needle ? roster.filter(s => s.name.toLocaleLowerCase("uk").includes(needle)) : roster;

  return (
    <div className="grid gap-3">
      {roster.length > 8 && (
        <Input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Пошук за прізвищем або ім’ям"
          aria-label="Пошук за прізвищем або ім’ям"
          className="h-12 text-base"
        />
      )}
      {visible.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Учня з таким ім’ям у списку немає.</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map(s => (
            <li key={s.id}>
              <Link
                href={`/student/login?code=${encodeURIComponent(code)}&s=${s.id}`}
                className="flex min-h-14 items-center justify-between rounded-lg border bg-card px-3 py-2 text-base hover:bg-muted"
              >
                {s.name}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
