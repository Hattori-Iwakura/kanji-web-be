-- CreateEnum
CREATE TYPE "PublicDeckRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PublicDeckRequest" (
    "id" SERIAL NOT NULL,
    "deck_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PublicDeckRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDeckRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicDeckRequest_deck_id_idx" ON "PublicDeckRequest"("deck_id");

-- CreateIndex
CREATE INDEX "PublicDeckRequest_user_id_idx" ON "PublicDeckRequest"("user_id");

-- CreateIndex
CREATE INDEX "PublicDeckRequest_status_idx" ON "PublicDeckRequest"("status");

-- AddForeignKey
ALTER TABLE "PublicDeckRequest" ADD CONSTRAINT "PublicDeckRequest_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicDeckRequest" ADD CONSTRAINT "PublicDeckRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicDeckRequest" ADD CONSTRAINT "PublicDeckRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
