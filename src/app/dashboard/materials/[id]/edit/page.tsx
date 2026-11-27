import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { editableMaterials, schoolSubjects } from "@/lib/staff";
import { MaterialForm } from "../../material-form";

export const metadata: Metadata = { title: "Редагувати матеріал" };

export default function EditMaterialPage({ params }: PageProps<"/dashboard/materials/[id]/edit">) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Редагувати матеріал</h1>
      <Suspense>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: Pick<PageProps<"/dashboard/materials/[id]/edit">, "params">) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const [m] = Number.isInteger(id) ? await db.select().from(materials).where(and(eq(materials.id, id), editableMaterials(me))) : [];
  if (!m) notFound();
  return <MaterialForm values={m} subjects={await schoolSubjects(me.schoolId)} />;
}
