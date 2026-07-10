"use client";

import { useState } from "react";
import type { BookSearchResult } from "@/lib/googleBooks";
import { BookSearch } from "./BookSearch";

export function SuggestForm({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState<BookSearchResult | null>(null);

  if (!selected) {
    return <BookSearch onSelect={setSelected} />;
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="title" value={selected.title} />
      <input type="hidden" name="author" value={selected.author} />
      <input type="hidden" name="coverUrl" value={selected.coverUrl ?? ""} />
      <input type="hidden" name="genre" value={selected.genre ?? ""} />

      <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
        {selected.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.coverUrl}
            alt=""
            className="h-16 w-11 object-cover"
          />
        )}
        <div className="flex-1">
          <div className="font-medium">{selected.title}</div>
          <div className="text-sm text-gray-600">{selected.author}</div>
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm text-gray-500 underline"
        >
          Change
        </button>
      </div>

      <textarea
        name="note"
        placeholder="Why this book? (optional)"
        className="rounded-md border border-gray-300 px-3 py-2 text-base"
      />

      <button
        type="submit"
        className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white"
      >
        Suggest this book
      </button>
    </form>
  );
}
