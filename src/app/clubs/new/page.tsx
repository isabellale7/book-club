import { createClub } from "@/app/clubs/actions";
import { requireUser } from "@/lib/auth-helpers";

export default async function NewClubPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Create a club</h1>
      <form action={createClub} className="flex flex-col gap-3">
        <input
          type="text"
          name="name"
          required
          placeholder="Club name"
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
        <textarea
          name="description"
          placeholder="Description (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
        >
          Create club
        </button>
      </form>
    </main>
  );
}
