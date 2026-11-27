import { Suspense } from "react";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { schoolSubjects } from "@/lib/staff";
import { MaterialForm } from "../material-form";

export const metadata: Metadata = { title: "Новий матеріал" };

export default function NewMaterialPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Новий матеріал</h1>
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
