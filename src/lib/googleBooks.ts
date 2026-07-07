export type BookSearchResult = {
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
};

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query, maxResults: "8" });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
  );
  if (!res.ok) return [];

  const data = await res.json();
  const items: unknown[] = data.items ?? [];

  return items.map((item) => {
    const info = (item as { volumeInfo?: Record<string, unknown> })
      .volumeInfo ?? {};
    const authors = (info.authors as string[] | undefined) ?? [];
    const imageLinks = info.imageLinks as
      | { thumbnail?: string; smallThumbnail?: string }
      | undefined;

    return {
      title: (info.title as string) ?? "Untitled",
      author: authors.join(", ") || "Unknown author",
      coverUrl:
        imageLinks?.thumbnail?.replace("http://", "https://") ??
        imageLinks?.smallThumbnail?.replace("http://", "https://") ??
        null,
      description: (info.description as string) ?? null,
    };
  });
}
