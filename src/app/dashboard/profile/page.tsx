import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { RANK_LABEL } from "@/lib/staff-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";
import { PasswordForm } from "./password-form";

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
      <form action={updateProfile} className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          {u.email} · {RANK_LABEL[me.rank]}
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Ім’я</Label>
          <Input id="name" name="name" required maxLength={200} defaultValue={me.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="title">Посада</Label>
          <Input id="title" name="title" maxLength={200} defaultValue={me.title ?? ""} placeholder="Наприклад: Учителька історії" />
        </div>
        <Button type="submit" variant="outline" className="w-fit">
          Зберегти
        </Button>
      </form>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Змінити пароль</h2>
        <PasswordForm />
      </section>
    </>
  );
}
