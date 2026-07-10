import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import {
  submitRanking,
  closeRound,
  markFinished,
  setMeeting,
  updateProgress,
} from "@/app/clubs/[clubId]/actions";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();

  const [round, currentlyReading] = await Promise.all([
    prisma.round.findFirst({
      where: { clubId, status: "OPEN" },
      orderBy: { opensAt: "desc" },
      include: {
        suggestions: {
          include: {
            suggestedBy: true,
            votes: true,
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.readBook.findFirst({
      where: { clubId, finishedAt: null },
      orderBy: { startedAt: "desc" },
      include: {
        meeting: true,
        progress: { include: { user: true }, orderBy: { updatedAt: "desc" } },
      },
    }),
  ]);

  const isOrganizer = membership.role === "ORGANIZER";
  const myProgress = currentlyReading?.progress.find(
    (p) => p.userId === user.id,
  );
  const myRankBySuggestion = new Map(
    round?.suggestions
      .map((s) => {
        const myVote = s.votes.find((v) => v.userId === user.id);
        return myVote ? ([s.id, myVote.rank] as const) : null;
      })
      .filter((entry): entry is [string, number] => entry !== null),
  );

  const host = (await headers()).get("host");
  const inviteUrl = host
    ? `${host.includes("localhost") ? "http" : "https"}://${host}/invite/${club.inviteCode}`
    : `/invite/${club.inviteCode}`;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-gray-600 underline">
        ← Your clubs
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{club.name}</h1>
        <Link
          href={`/clubs/${clubId}/history`}
          className="text-sm text-gray-600 underline"
        >
          History
        </Link>
      </div>
      {club.description && (
        <p className="mt-1 text-sm text-gray-600">{club.description}</p>
      )}

      {currentlyReading && (
        <section className="mt-6 rounded-md border border-gray-200 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Currently reading
          </div>
          <div className="mt-1 flex gap-3">
            {currentlyReading.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentlyReading.coverUrl}
                alt=""
                className="h-20 w-14 object-cover"
              />
            )}
            <div>
              <div className="font-medium">{currentlyReading.title}</div>
              <div className="text-sm text-gray-600">
                {currentlyReading.author}
              </div>
            </div>
          </div>
          {isOrganizer && (
            <form
              action={markFinished.bind(null, clubId, currentlyReading.id)}
              className="mt-3"
            >
              <button
                type="submit"
                className="text-sm font-medium text-gray-900 underline"
              >
                Mark as finished
              </button>
            </form>
          )}

          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Meeting
            </div>
            {currentlyReading.meeting ? (
              <div className="mt-1 text-sm text-gray-700">
                <div>
                  {currentlyReading.meeting.scheduledAt.toLocaleString(
                    undefined,
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}
                </div>
                {currentlyReading.meeting.location && (
                  <div className="text-gray-600">
                    {currentlyReading.meeting.location}
                  </div>
                )}
                {currentlyReading.meeting.videoUrl && (
                  <a
                    href={currentlyReading.meeting.videoUrl}
                    className="break-all text-gray-600 underline"
                  >
                    {currentlyReading.meeting.videoUrl}
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Not scheduled yet.
              </p>
            )}

            {isOrganizer && (
              <form
                action={setMeeting.bind(null, clubId, currentlyReading.id)}
                className="mt-2 flex flex-col gap-2"
              >
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  required
                  defaultValue={
                    currentlyReading.meeting
                      ? toDatetimeLocalValue(
                          currentlyReading.meeting.scheduledAt,
                        )
                      : undefined
                  }
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  name="location"
                  placeholder="Location (optional)"
                  defaultValue={currentlyReading.meeting?.location ?? ""}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  name="videoUrl"
                  placeholder="Video call link (optional)"
                  defaultValue={currentlyReading.meeting?.videoUrl ?? ""}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
                >
                  {currentlyReading.meeting
                    ? "Update meeting"
                    : "Schedule meeting"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Reading progress
            </div>
            {currentlyReading.progress.length === 0 ? (
              <p className="mt-1 text-sm text-gray-600">
                No one has shared their progress yet.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {currentlyReading.progress.map((p) => (
                  <li key={p.id} className="text-sm text-gray-700">
                    {p.user.name ?? p.user.email}: chapter {p.currentChapter}
                    {p.totalChapters ? ` of ${p.totalChapters}` : ""}
                  </li>
                ))}
              </ul>
            )}

            <form
              action={updateProgress.bind(null, clubId, currentlyReading.id)}
              className="mt-2 flex items-center gap-2"
            >
              <input
                type="number"
                name="currentChapter"
                required
                min={0}
                placeholder="Chapter"
                defaultValue={myProgress?.currentChapter}
                className="w-20 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <span className="text-sm text-gray-500">of</span>
              <input
                type="number"
                name="totalChapters"
                min={0}
                placeholder="Total (optional)"
                defaultValue={myProgress?.totalChapters ?? undefined}
                className="w-28 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
              >
                Update
              </button>
            </form>
          </div>
        </section>
      )}

      {isOrganizer && (
        <section className="mt-6 rounded-md bg-gray-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Invite members
          </div>
          <p className="mt-1 break-all text-sm text-gray-700">{inviteUrl}</p>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rank the next book</h2>
          <Link
            href={`/clubs/${clubId}/suggest`}
            className="text-sm font-medium text-gray-900 underline"
          >
            + Suggest
          </Link>
        </div>

        {!round || round.suggestions.length === 0 ? (
          <p className="text-sm text-gray-600">
            No suggestions yet — be the first.
          </p>
        ) : (
          <form action={submitRanking.bind(null, clubId, round.id)}>
            <ul className="flex flex-col gap-3">
              {round.suggestions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-md border border-gray-200 p-3"
                >
                  {s.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.coverUrl}
                      alt=""
                      className="h-16 w-11 object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-gray-600">{s.author}</div>
                    {s.note && (
                      <div className="mt-1 text-sm text-gray-500">
                        &ldquo;{s.note}&rdquo;
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-400">
                      suggested by{" "}
                      {s.suggestedBy.name ?? s.suggestedBy.email}
                    </div>
                    <Link
                      href={`/clubs/${clubId}/suggestions/${s.id}`}
                      className="mt-1 inline-block text-xs font-medium text-gray-600 underline"
                    >
                      {s._count.comments === 0
                        ? "Discuss"
                        : `${s._count.comments} comment${s._count.comments === 1 ? "" : "s"}`}
                    </Link>
                  </div>
                  <select
                    name={`rank_${s.id}`}
                    defaultValue={myRankBySuggestion.get(s.id) ?? ""}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value="">Not ranked</option>
                    {round.suggestions.map((_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                        {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}{" "}
                        choice
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-gray-500">
              Rank as many suggestions as you like, 1st choice first. Rankings
              are hidden from other members until the organizer closes
              voting.
            </p>

            <button
              type="submit"
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900"
            >
              Save my ranking
            </button>
          </form>
        )}

        {isOrganizer && round && round.suggestions.length > 0 && (
          <form
            action={closeRound.bind(null, clubId, round.id)}
            className="mt-4"
          >
            <button
              type="submit"
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
            >
              Close voting and pick a winner
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
