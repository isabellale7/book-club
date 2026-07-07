"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";

export async function createClub(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) throw new Error("Club name is required");

  const club = await prisma.club.create({
    data: {
      name,
      description: description || null,
      createdById: user.id,
      memberships: {
        create: { userId: user.id, role: "ORGANIZER" },
      },
      rounds: {
        create: { status: "OPEN" },
      },
    },
  });

  redirect(`/clubs/${club.id}`);
}

export async function joinClub(inviteCode: string) {
  const user = await requireUser();

  const club = await prisma.club.findUnique({ where: { inviteCode } });
  if (!club) throw new Error("Invalid invite link");

  await prisma.membership.upsert({
    where: { userId_clubId: { userId: user.id, clubId: club.id } },
    update: {},
    create: { userId: user.id, clubId: club.id, role: "MEMBER" },
  });

  redirect(`/clubs/${club.id}`);
}
