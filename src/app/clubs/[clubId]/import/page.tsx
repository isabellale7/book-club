import Link from "next/link";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { importReadingHistory } from "@/app/clubs/[clubId]/actions";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);

  if (membership.role !== "ORGANIZER") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <p className="text-sm text-gray-600">
          Only the club organizer can import reading history.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link
        href={`/clubs/${clubId}`}
        className="text-sm text-gray-600 underline"
      >
        ← Back to club
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-semibold">Import reading history</h1>
      <p className="mb-4 text-sm text-gray-600">
        Neither Goodreads nor The StoryGraph offer a live API, so this reads
        the CSV library export each service lets you download from your
        account settings. Rows that look finished (they have a star rating
        or a read date) are added to this club&apos;s history, rated under
        your account. Everyone else can add their own rating afterward from
        the book&apos;s page in History.
      </p>
      <form
        action={importReadingHistory.bind(null, clubId)}
        className="flex flex-col gap-3"
      >
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          Import
        </button>
      </form>
    </main>
  );
}
