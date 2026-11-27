import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
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
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/materials" className="underline-offset-4 hover:underline">
            Матеріали
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Редагувати матеріал</h1>
      </header>
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
