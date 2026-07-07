import Link from "next/link";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { addSuggestion } from "@/app/clubs/[clubId]/actions";
import { SuggestForm } from "./SuggestForm";

export default async function SuggestPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <Link href={`/clubs/${clubId}`} className="text-sm text-gray-600 underline">
        ← Back to club
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Suggest a book</h1>
      <SuggestForm action={addSuggestion.bind(null, clubId)} />
    </main>
  );
}
