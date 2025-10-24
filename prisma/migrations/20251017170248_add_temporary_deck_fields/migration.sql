-- AlterTable
ALTER TABLE "FlashcardDeck" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_temporary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "FlashcardDeck_is_temporary_expires_at_idx" ON "FlashcardDeck"("is_temporary", "expires_at");
