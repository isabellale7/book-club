-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "readBookId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_readBookId_key" ON "Meeting"("readBookId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_readBookId_fkey" FOREIGN KEY ("readBookId") REFERENCES "ReadBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
