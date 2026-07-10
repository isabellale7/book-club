type RatedBook = {
  genre: string | null;
  ratings: { score: number }[];
};

export type GenreStat = { genre: string; avg: number; count: number };

/**
 * Ranks genres by average rating across all of a club's rated, genred books.
 * Deterministic and rating/genre-based only — no AI, matching the PRD's
 * explicit "no AI-generated recommendations in v1" non-goal.
 */
export function topGenresByRating(
  books: RatedBook[],
  limit = 3,
): GenreStat[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const book of books) {
    if (!book.genre) continue;
    for (const rating of book.ratings) {
      const stat = totals.get(book.genre) ?? { total: 0, count: 0 };
      stat.total += rating.score;
      stat.count += 1;
      totals.set(book.genre, stat);
    }
  }

  return [...totals.entries()]
    .map(([genre, { total, count }]) => ({ genre, avg: total / count, count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}
