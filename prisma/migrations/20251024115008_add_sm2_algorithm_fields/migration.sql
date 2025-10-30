-- AlterTable
ALTER TABLE "FlashcardCard" ADD COLUMN     "easinessFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "repetitions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FlashcardStudySession" ADD COLUMN     "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalCards" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SessionCard" (
    "sessionId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isNew" BOOLEAN NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "quality" INTEGER,
    "timeSpent" DOUBLE PRECISION,
    "isCorrect" BOOLEAN,

    CONSTRAINT "SessionCard_pkey" PRIMARY KEY ("sessionId","cardId")
);

-- CreateIndex
CREATE INDEX "SessionCard_sessionId_idx" ON "SessionCard"("sessionId");

-- CreateIndex
CREATE INDEX "SessionCard_cardId_idx" ON "SessionCard"("cardId");

-- CreateIndex
CREATE INDEX "FlashcardCard_lastReviewedAt_idx" ON "FlashcardCard"("lastReviewedAt");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_startedAt_idx" ON "FlashcardStudySession"("startedAt");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_completedAt_idx" ON "FlashcardStudySession"("completedAt");

-- AddForeignKey
ALTER TABLE "SessionCard" ADD CONSTRAINT "SessionCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FlashcardStudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCard" ADD CONSTRAINT "SessionCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "FlashcardCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
