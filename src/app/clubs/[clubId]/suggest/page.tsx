import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { addSuggestion } from "@/app/clubs/[clubId]/actions";
import { topGenresByRating } from "@/lib/genreStats";
import { SuggestForm } from "./SuggestForm";

export default async function SuggestPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { clubId } = await params;
  const { round: roundId } = await searchParams;
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  if (!roundId) notFound();
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.clubId !== clubId || round.status !== "OPEN") {
    notFound();
  }

  const ratedBooks = await prisma.readBook.findMany({
    where: { clubId, genre: { not: null } },
    select: { genre: true, ratings: { select: { score: true } } },
  });
  const topGenres = topGenresByRating(ratedBooks);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link href={`/clubs/${clubId}`} className="text-sm text-gray-600 underline">
        ← Back to club
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">
        Suggest a book{round.trackName !== "General" && ` — ${round.trackName}`}
      </h1>

      {topGenres.length > 0 && (
        <div className="mb-4 rounded-md bg-gray-50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Your club loves
          </div>
          <ul className="mt-1 text-sm text-gray-700">
            {topGenres.map((g) => (
              <li key={g.genre}>
                {g.genre} — ★ {g.avg.toFixed(1)} ({g.count}{" "}
                {g.count === 1 ? "rating" : "ratings"})
              </li>
            ))}
          </ul>
        </div>
      )}

      <SuggestForm action={addSuggestion.bind(null, clubId, round.id)} />
    </main>
  );
}
