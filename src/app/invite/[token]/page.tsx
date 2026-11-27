// The invite link a director or deputy sends by hand. Public: the token in the URL is the credential.
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { invites, schools } from "@/db/schema";
import { RANK_LABEL } from "@/lib/staff-labels";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Запрошення" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-4">
      <Suspense>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  const [invite] = await db
    .select({ email: invites.email, rank: invites.rank, school: schools.name })
    .from(invites)
    .innerJoin(schools, eq(schools.id, invites.schoolId))
    .where(and(eq(invites.tokenHash, createHash("sha256").update(token).digest("hex")), isNull(invites.usedAt), gt(invites.expiresAt, sql`now()`)));

  if (!invite)
    return (
      <>
        <h1 className="text-2xl font-semibold">Посилання не діє</h1>
        <p className="text-muted-foreground">Його вже використали або минуло 7 днів. Попросіть директора чи заступника надіслати нове.</p>
        <Link href="/login" className="text-sm underline-offset-4 hover:underline">
          Вхід для вчителя
        </Link>
      </>
    );

  return (
    <>
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {invite.school} · {RANK_LABEL[invite.rank]}
        </p>
        <h1 className="text-2xl font-semibold">Ласкаво просимо</h1>
        <p className="text-muted-foreground">
          Ви входитимете з email <span className="font-medium text-foreground">{invite.email}</span>. Вкажіть ім’я та придумайте пароль.
        </p>
      </header>
      <AcceptForm token={token} />
    </>
  );
}
