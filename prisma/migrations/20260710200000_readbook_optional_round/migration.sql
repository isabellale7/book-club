-- DropForeignKey
ALTER TABLE "ReadBook" DROP CONSTRAINT "ReadBook_roundId_fkey";

-- AlterTable
ALTER TABLE "ReadBook" ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "roundId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ReadBook" ADD CONSTRAINT "ReadBook_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
