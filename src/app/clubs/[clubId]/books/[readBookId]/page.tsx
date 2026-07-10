import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { rateBook } from "@/app/clubs/[clubId]/actions";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; readBookId: string }>;
}) {
  const { clubId, readBookId } = await params;
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const readBook = await prisma.readBook.findUnique({
    where: { id: readBookId },
    include: { ratings: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!readBook || readBook.clubId !== clubId) notFound();

  const myRating = readBook.ratings.find((r) => r.userId === user.id);
  const otherRatings = readBook.ratings.filter((r) => r.userId !== user.id);
  const avg =
    readBook.ratings.length > 0
      ? readBook.ratings.reduce((sum, r) => sum + r.score, 0) /
        readBook.ratings.length
      : null;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link
        href={`/clubs/${clubId}/history`}
        className="text-sm text-gray-600 underline"
      >
        ← Back to history
      </Link>

      <div className="mt-2 flex gap-3">
        {readBook.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={readBook.coverUrl}
            alt=""
            className="h-28 w-20 object-cover"
          />
        )}
        <div>
          <h1 className="text-xl font-semibold">{readBook.title}</h1>
          <div className="text-sm text-gray-600">{readBook.author}</div>
          {avg !== null && (
            <div className="mt-1 text-sm font-medium text-gray-700">
              ★ {avg.toFixed(1)} average ({readBook.ratings.length}{" "}
              {readBook.ratings.length === 1 ? "rating" : "ratings"})
            </div>
          )}
        </div>
      </div>

      {!readBook.finishedAt ? (
        <p className="mt-6 text-sm text-gray-600">
          Ratings open once the club marks this book as finished.
        </p>
      ) : (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">
            {myRating ? "Update your rating" : "Rate this book"}
          </h2>
          <form
            action={rateBook.bind(null, clubId, readBookId)}
            className="flex flex-col gap-3"
          >
            <select
              name="score"
              required
              defaultValue={myRating?.score ?? ""}
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              <option value="" disabled>
                Select a rating
              </option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
            <textarea
              name="reviewText"
              placeholder="Short review (optional)"
              defaultValue={myRating?.reviewText ?? ""}
              className="rounded-md border border-gray-300 px-3 py-2 text-base"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
            >
              {myRating ? "Update rating" : "Submit rating"}
            </button>
          </form>
        </section>
      )}

      {otherRatings.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Other reviews</h2>
          <ul className="flex flex-col gap-3">
            {otherRatings.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-gray-200 p-3"
              >
                <div className="text-sm font-medium">
                  ★ {r.score} — {r.user.name ?? r.user.email}
                </div>
                {r.reviewText && (
                  <div className="mt-1 text-sm text-gray-600">
                    {r.reviewText}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
