"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireMembership } from "@/lib/auth-helpers";

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

export async function castVote(clubId: string, suggestionId: string) {
  const user = await requireUser();
  await requireMembership(clubId, user.id);

  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    include: { round: true },
  });
  if (!suggestion || suggestion.round.clubId !== clubId) notFound();
  if (suggestion.round.status !== "OPEN") {
    throw new Error("Voting is closed for this round");
  }

  await prisma.vote.upsert({
    where: {
      roundId_userId: { roundId: suggestion.roundId, userId: user.id },
    },
    update: { suggestionId },
    create: { roundId: suggestion.roundId, userId: user.id, suggestionId },
  });

  revalidatePath(`/clubs/${clubId}`);
}

export async function closeRound(clubId: string, roundId: string) {
  const user = await requireUser();
  const membership = await requireMembership(clubId, user.id);
  if (membership.role !== "ORGANIZER") {
    throw new Error("Only the organizer can close voting");
  }

  await prisma.$transaction(async (tx) => {
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

    const winner = round.suggestions.reduce((best, current) =>
      current.votes.length > best.votes.length ? current : best,
    );

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
  });

  revalidatePath(`/clubs/${clubId}`);
}
