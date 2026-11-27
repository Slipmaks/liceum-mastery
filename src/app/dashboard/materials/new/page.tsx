import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { schoolSubjects } from "@/lib/staff";
import { MaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Новий матеріал" };

export default function NewMaterialPage() {
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/materials" className="underline-offset-4 hover:underline">
            Матеріали
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Новий матеріал</h1>
      </header>
      <Suspense>
        <New />
      </Suspense>
    </div>
  );
}

async function New() {
  const me = await requireStaff();
  return <MaterialForm subjects={await schoolSubjects(me.schoolId)} />;
}
