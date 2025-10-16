-- CreateEnum
CREATE TYPE "StudySessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "FlashcardStudySession" ADD COLUMN     "card_order" JSONB,
ADD COLUMN     "cards_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "current_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE';
