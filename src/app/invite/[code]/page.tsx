import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { joinClub } from "@/app/clubs/actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const club = await prisma.club.findUnique({ where: { inviteCode: code } });
  if (!club) notFound();

  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">
          You&apos;re invited to {club.name}
        </h1>
        <p className="text-sm text-gray-600">
          Sign in first, then come back and open this invite link again to
          join.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_clubId: { userId: session.user.id, clubId: club.id } },
  });
  if (membership) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">You&apos;re already in {club.name}</h1>
        <Link
          href={`/clubs/${club.id}`}
          className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
        >
          Go to club
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">
        You&apos;re invited to {club.name}
      </h1>
      {club.description && (
        <p className="text-sm text-gray-600">{club.description}</p>
      )}
      <form action={joinClub.bind(null, code)}>
        <button
          type="submit"
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
        >
          Join club
        </button>
      </form>
    </main>
  );
}
