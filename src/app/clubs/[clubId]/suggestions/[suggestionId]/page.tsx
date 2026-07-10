import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { addComment } from "@/app/clubs/[clubId]/actions";

export default async function SuggestionDiscussionPage({
  params,
}: {
  params: Promise<{ clubId: string; suggestionId: string }>;
}) {
  const { clubId, suggestionId } = await params;
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    include: {
      round: true,
      suggestedBy: true,
      comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!suggestion || suggestion.round.clubId !== clubId) notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link
        href={`/clubs/${clubId}`}
        className="text-sm text-gray-600 underline"
      >
        ← Back to club
      </Link>

      <div className="mt-2 flex gap-3">
        {suggestion.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.coverUrl}
            alt=""
            className="h-28 w-20 object-cover"
          />
        )}
        <div>
          <h1 className="text-xl font-semibold">{suggestion.title}</h1>
          <div className="text-sm text-gray-600">{suggestion.author}</div>
          {suggestion.note && (
            <div className="mt-1 text-sm text-gray-500">
              &ldquo;{suggestion.note}&rdquo;
            </div>
          )}
          <div className="mt-1 text-xs text-gray-400">
            suggested by{" "}
            {suggestion.suggestedBy.name ?? suggestion.suggestedBy.email}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Discussion</h2>

        {suggestion.comments.length === 0 ? (
          <p className="text-sm text-gray-600">
            No comments yet — be the first to weigh in.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestion.comments.map((c) => (
              <li key={c.id} className="rounded-md border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">
                  {c.user.name ?? c.user.email}
                </div>
                <div className="mt-1 text-sm text-gray-800">{c.body}</div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addComment.bind(null, clubId, suggestionId)}
          className="mt-4 flex flex-col gap-3"
        >
          <textarea
            name="body"
            required
            placeholder="Add a comment..."
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
          >
            Post comment
          </button>
        </form>
      </section>
    </main>
  );
}
