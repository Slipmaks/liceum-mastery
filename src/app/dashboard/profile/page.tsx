import { Suspense } from "react";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { RANK_LABEL } from "@/lib/staff-labels";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Профіль" };

export default function ProfilePage() {
  return (
    <div className="grid max-w-md gap-8">
      <h1 className="text-2xl font-semibold">Профіль</h1>
      <Suspense>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const me = await requireStaff();
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, me.id));
  return (
    <>
      <ProfileForm email={u.email} rankLabel={RANK_LABEL[me.rank]} initial={{ name: me.name, title: me.title ?? "" }} />
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Змінити пароль</h2>
        <PasswordForm />
      </section>
    </>
  );
}
