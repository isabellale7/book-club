-- AlterTable
ALTER TABLE "Vote" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Vote" ALTER COLUMN "rank" DROP DEFAULT;

-- DropIndex
DROP INDEX "Vote_roundId_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Vote_roundId_userId_suggestionId_key" ON "Vote"("roundId", "userId", "suggestionId");
