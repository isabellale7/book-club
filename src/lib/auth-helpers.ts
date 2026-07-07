import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireMembership(clubId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) notFound();
  return membership;
}
