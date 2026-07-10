/** A single voter's preferences, ordered from 1st choice to last. Ranks may be partial. */
export type Ballot = string[];

/**
 * Instant-runoff: repeatedly drop the candidate with the fewest current
 * first-choice votes among remaining candidates until one has a majority
 * of active ballots (or only one candidate is left). Ties for last place
 * are broken by `candidateIds` order, i.e. the order suggestions were
 * added in — deterministic, but arbitrary among tied candidates.
 */
export function runInstantRunoff(
  candidateIds: string[],
  ballots: Ballot[],
): string {
  if (candidateIds.length === 0) throw new Error("No candidates to tally");

  const remaining = new Set(candidateIds);

  while (remaining.size > 1) {
    const counts = new Map<string, number>();
    for (const id of remaining) counts.set(id, 0);

    let activeBallots = 0;
    for (const ballot of ballots) {
      const choice = ballot.find((id) => remaining.has(id));
      if (choice) {
        counts.set(choice, (counts.get(choice) ?? 0) + 1);
        activeBallots++;
      }
    }

    if (activeBallots > 0) {
      for (const [id, count] of counts) {
        if (count > activeBallots / 2) return id;
      }
    }

    const minCount = Math.min(...counts.values());
    const toEliminate = candidateIds.find(
      (id) => remaining.has(id) && counts.get(id) === minCount,
    );
    remaining.delete(toEliminate!);
  }

  return remaining.values().next().value!;
}
