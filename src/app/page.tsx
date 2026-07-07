import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export default async function Dashboard() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { club: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your clubs</h1>
        <Link
          href="/clubs/new"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          + New club
        </Link>
      </div>

      {memberships.length === 0 ? (
        <p className="text-sm text-gray-600">
          You&apos;re not in any clubs yet. Create one, or ask a friend for
          their invite link.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {memberships.map(({ club }) => (
            <li key={club.id}>
              <Link
                href={`/clubs/${club.id}`}
                className="block rounded-md border border-gray-200 px-4 py-3 hover:border-gray-400"
              >
                <div className="font-medium">{club.name}</div>
                {club.description && (
                  <div className="text-sm text-gray-600">
                    {club.description}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
