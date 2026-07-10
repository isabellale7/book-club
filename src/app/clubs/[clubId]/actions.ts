"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";
import { runInstantRunoff, type Ballot } from "@/lib/instantRunoff";
import { sendEmail } from "@/lib/email";

export async function addSuggestion(clubId: string, formData: FormData) {
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!title || !author) throw new Error("Title and author are required");

  const round = await prisma.round.findFirst({
    where: { clubId, status: "OPEN" },
  });
  if (!round) throw new Error("This club has no open voting round");

  await prisma.suggestion.create({
    data: {
      roundId: round.id,
      suggestedById: user.id,
      title,
      author,
      coverUrl,
      note,
    },
  });

  redirect(`/clubs/${clubId}`);
}

export async function submitRanking(
  clubId: string,
  roundId: string,
  formData: FormData,
) {
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { suggestions: true },
  });
  if (!round || round.clubId !== clubId) notFound();
  if (round.status !== "OPEN") throw new Error("Voting is closed for this round");

  const validSuggestionIds = new Set(round.suggestions.map((s) => s.id));

  // Each ranked suggestion arrives as rank_<suggestionId>=<1-based rank>,
  // left blank ("") for suggestions the voter didn't rank.
  const ranked: { suggestionId: string; rank: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("rank_")) continue;
    const suggestionId = key.slice("rank_".length);
    if (!validSuggestionIds.has(suggestionId)) continue;
    const raw = String(value).trim();
    if (!raw) continue;
    const rank = Number(raw);
    if (!Number.isInteger(rank) || rank < 1) {
      throw new Error("Ranks must be positive whole numbers");
    }
    ranked.push({ suggestionId, rank });
  }

  const ranks = ranked.map((r) => r.rank);
  if (new Set(ranks).size !== ranks.length) {
    throw new Error("Each rank can only be used once — check for duplicates");
  }

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { roundId, userId: user.id } }),
    ...ranked.map((r) =>
      prisma.vote.create({
        data: { roundId, userId: user.id, suggestionId: r.suggestionId, rank: r.rank },
      }),
    ),
  ]);

  revalidatePath(`/clubs/${clubId}`);
}

export async function closeRound(clubId: string, roundId: string) {
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);
  if (membership.role !== "ORGANIZER") {
    throw new Error("Only the organizer can close voting");
  }

  const { club, winner } = await prisma.$transaction(async (tx) => {
    const round = await tx.round.findUnique({
      where: { id: roundId },
      include: {
        suggestions: { include: { votes: true } },
      },
    });
    if (!round || round.clubId !== clubId) notFound();
    if (round.status !== "OPEN") throw new Error("Round is already closed");
    if (round.suggestions.length === 0) {
      throw new Error("Can't close a round with no suggestions");
    }

    const candidateIds = round.suggestions.map((s) => s.id);
    const ballotsByUser = new Map<string, { suggestionId: string; rank: number }[]>();
    for (const suggestion of round.suggestions) {
      for (const vote of suggestion.votes) {
        const ballot = ballotsByUser.get(vote.userId) ?? [];
        ballot.push({ suggestionId: vote.suggestionId, rank: vote.rank });
        ballotsByUser.set(vote.userId, ballot);
      }
    }
    const ballots: Ballot[] = [...ballotsByUser.values()].map((votes) =>
      votes.sort((a, b) => a.rank - b.rank).map((v) => v.suggestionId),
    );

    const winnerId = runInstantRunoff(candidateIds, ballots);
    const winner = round.suggestions.find((s) => s.id === winnerId)!;

    await tx.round.update({
      where: { id: roundId },
      data: {
        status: "CLOSED",
        closesAt: new Date(),
        winningSuggestionId: winner.id,
      },
    });

    await tx.readBook.create({
      data: {
        clubId,
        roundId,
        title: winner.title,
        author: winner.author,
        coverUrl: winner.coverUrl,
      },
    });

    await tx.round.create({
      data: { clubId, status: "OPEN" },
    });

    const club = await tx.club.findUniqueOrThrow({ where: { id: clubId } });
    return { club, winner };
  });

  await notifyRoundClosed(clubId, club.name, winner.title, winner.author);

  revalidatePath(`/clubs/${clubId}`);
}

async function notifyRoundClosed(
  clubId: string,
  clubName: string,
  winnerTitle: string,
  winnerAuthor: string,
) {
  const memberships = await prisma.membership.findMany({
    where: { clubId },
    include: { user: true },
  });
  const clubUrl = `${process.env.NEXTAUTH_URL}/clubs/${clubId}`;

  const results = await Promise.allSettled(
    memberships.map((m) =>
      sendEmail({
        to: m.user.email,
        subject: `${clubName}: "${winnerTitle}" is next`,
        text: `The club picked "${winnerTitle}" by ${winnerAuthor} as the next read.\n\nVoting is now open for the pick after that: ${clubUrl}`,
      }),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send round-closed notification:", result.reason);
    }
  }
}

export async function markFinished(clubId: string, readBookId: string) {
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);
  if (membership.role !== "ORGANIZER") {
    throw new Error("Only the organizer can mark a book as finished");
  }

  const readBook = await prisma.readBook.findUnique({
    where: { id: readBookId },
  });
  if (!readBook || readBook.clubId !== clubId) notFound();
  if (readBook.finishedAt) throw new Error("Already marked as finished");

  await prisma.readBook.update({
    where: { id: readBookId },
    data: { finishedAt: new Date() },
  });

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/history`);
}

export async function rateBook(
  clubId: string,
  readBookId: string,
  formData: FormData,
) {
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const readBook = await prisma.readBook.findUnique({
    where: { id: readBookId },
  });
  if (!readBook || readBook.clubId !== clubId) notFound();
  if (!readBook.finishedAt) {
    throw new Error("Can't rate a book the club hasn't finished yet");
  }

  const score = Number(formData.get("score"));
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Rating must be a whole number from 1 to 5");
  }
  const reviewText = String(formData.get("reviewText") ?? "").trim() || null;

  await prisma.rating.upsert({
    where: { readBookId_userId: { readBookId, userId: user.id } },
    update: { score, reviewText },
    create: { readBookId, userId: user.id, score, reviewText },
  });

  revalidatePath(`/clubs/${clubId}/books/${readBookId}`);
  revalidatePath(`/clubs/${clubId}/history`);
}
