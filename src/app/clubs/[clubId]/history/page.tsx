import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();

  const readBooks = await prisma.readBook.findMany({
    where: { clubId, finishedAt: { not: null } },
    include: { ratings: true },
    orderBy: { finishedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link
        href={`/clubs/${clubId}`}
        className="text-sm text-gray-600 underline"
      >
        ← Back to club
      </Link>
      <div className="mt-2 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {club.name} — Reading history
        </h1>
        {membership.role === "ORGANIZER" && (
          <Link
            href={`/clubs/${clubId}/import`}
            className="text-sm font-medium text-gray-900 underline"
          >
            Import
          </Link>
        )}
      </div>

      {readBooks.length === 0 ? (
        <p className="text-sm text-gray-600">
          No finished books yet — once the organizer marks the current book as
          finished, it&apos;ll show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {readBooks.map((book) => {
            const avg =
              book.ratings.length > 0
                ? book.ratings.reduce((sum, r) => sum + r.score, 0) /
                  book.ratings.length
                : null;
            return (
              <li key={book.id}>
                <Link
                  href={`/clubs/${clubId}/books/${book.id}`}
                  className="flex items-center gap-3 rounded-md border border-gray-200 p-3 hover:border-gray-400"
                >
                  {book.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-16 w-11 object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{book.title}</div>
                    <div className="text-sm text-gray-600">{book.author}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      finished{" "}
                      {book.finishedAt?.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {book.imported && " · imported"}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {avg !== null
                      ? `★ ${avg.toFixed(1)}`
                      : "Not yet rated"}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
