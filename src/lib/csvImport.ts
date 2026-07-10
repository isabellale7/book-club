import { parse } from "csv-parse/sync";

export type ImportedBook = {
  title: string;
  author: string;
  rating: number | null;
  dateRead: Date | null;
};

function findColumn(
  headers: string[],
  include: RegExp,
  exclude?: RegExp,
): number {
  return headers.findIndex(
    (h) => include.test(h) && (!exclude || !exclude.test(h)),
  );
}

/**
 * Parses a Goodreads or StoryGraph library export CSV. Both services only
 * offer CSV export (no live API), so "import" means the organizer uploads
 * that file. Column names differ between the two exports, so columns are
 * matched by keyword rather than exact header.
 */
export function parseLibraryExport(csvText: string): ImportedBook[] {
  const records: string[][] = parse(csvText, {
    skip_empty_lines: true,
    relax_column_count: true,
  });
  if (records.length === 0) return [];

  const headers = records[0].map((h) => h.trim().toLowerCase());
  const titleCol = findColumn(headers, /title/);
  const authorCol = findColumn(headers, /author/);
  const ratingCol = findColumn(headers, /rating/, /average/);
  const dateCol = findColumn(headers, /date read/);

  if (titleCol === -1 || authorCol === -1) {
    throw new Error(
      "Couldn't find title/author columns — is this a Goodreads or StoryGraph library export?",
    );
  }

  const books: ImportedBook[] = [];
  for (const row of records.slice(1)) {
    const title = row[titleCol]?.trim();
    const author = row[authorCol]?.trim();
    if (!title || !author) continue;

    const ratingRaw = ratingCol !== -1 ? Number(row[ratingCol]) : NaN;
    const rating =
      Number.isFinite(ratingRaw) && ratingRaw > 0
        ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
        : null;

    const dateRaw = dateCol !== -1 ? row[dateCol]?.trim() : "";
    const parsedDate = dateRaw ? new Date(dateRaw) : null;
    const dateRead =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    // Only import books actually finished — a rating or a read date is
    // evidence of that; rows with neither are usually "want to read" shelf
    // entries with no history to backfill.
    if (rating === null && dateRead === null) continue;

    books.push({ title, author, rating, dateRead });
  }

  return books;
}
