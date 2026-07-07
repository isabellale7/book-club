"use client";

import { useEffect, useState } from "react";
import type { BookSearchResult } from "@/lib/googleBooks";

export function BookSearch({
  onSelect,
}: {
  onSelect: (book: BookSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title or author"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base"
      />
      {loading && (
        <p className="mt-2 text-sm text-gray-500">Searching…</p>
      )}
      {query.trim() && results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {results.map((book, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(book)}
                className="flex w-full items-center gap-3 rounded-md border border-gray-200 p-2 text-left hover:border-gray-400"
              >
                {book.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt=""
                    className="h-14 w-10 object-cover"
                  />
                )}
                <div>
                  <div className="text-sm font-medium">{book.title}</div>
                  <div className="text-xs text-gray-600">{book.author}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
