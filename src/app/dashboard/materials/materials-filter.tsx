"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Values = {
  q: string;
  type: string;
  subject: string;
  grade: string;
  topic: string;
  author: string;
};

type Option = [string | number, string];

export function MaterialsFilter({
  values,
  types,
  subjects,
  grades,
  topics,
  authors,
  filtered,
}: {
  values: Values;
  types: Option[];
  subjects: Option[];
  grades: Option[];
  topics: Option[];
  authors: Option[];
  filtered: boolean;
}) {
  const router = useRouter();
  const qRef = useRef<HTMLInputElement>(null);

  const navigate = (patch: Partial<Values>) => {
    const next: Values = { ...values, q: qRef.current?.value ?? values.q, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      const trimmed = v.trim();
      if (trimmed) params.set(k, trimmed);
    }
    const qs = params.toString();
    router.push(qs ? `/dashboard/materials?${qs}` : "/dashboard/materials");
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        navigate({});
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="grid gap-1.5 text-sm">
        Пошук за назвою
        <Input key={values.q} ref={qRef} name="q" type="search" defaultValue={values.q} className="w-56" />
      </label>
      <FilterSelect label="Тип" name="type" value={values.type} options={types} onChange={v => navigate({ type: v })} />
      <FilterSelect label="Предмет" name="subject" value={values.subject} options={subjects} onChange={v => navigate({ subject: v })} />
      <FilterSelect label="Клас" name="grade" value={values.grade} options={grades} onChange={v => navigate({ grade: v })} />
      <FilterSelect label="Тема" name="topic" value={values.topic} options={topics} onChange={v => navigate({ topic: v })} />
      <FilterSelect label="Автор" name="author" value={values.author} options={authors} onChange={v => navigate({ author: v })} />
      <Button type="submit" variant="outline">
        Показати
      </Button>
      {filtered && (
        <Button asChild variant="ghost">
          <Link href="/dashboard/materials">Скинути</Link>
        </Button>
      )}
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label}
      <Select name={name} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Усі</option>
        {options.map(([v, text]) => (
          <option key={v} value={String(v)}>
            {text}
          </option>
        ))}
      </Select>
    </label>
  );
}
