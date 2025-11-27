-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardCard" (
    "id" SERIAL NOT NULL,
    "deck_id" INTEGER NOT NULL,
    "kanji_id" INTEGER,
    "front_text" TEXT NOT NULL,
    "back_text" TEXT NOT NULL,
    "hint" TEXT,
    "order_index" INTEGER,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardDeck_user_id_idx" ON "FlashcardDeck"("user_id");

-- CreateIndex
CREATE INDEX "FlashcardDeck_is_public_idx" ON "FlashcardDeck"("is_public");

-- CreateIndex
CREATE INDEX "FlashcardCard_deck_id_idx" ON "FlashcardCard"("deck_id");

-- CreateIndex
CREATE INDEX "FlashcardCard_kanji_id_idx" ON "FlashcardCard"("kanji_id");

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE SET NULL ON UPDATE CASCADE;
