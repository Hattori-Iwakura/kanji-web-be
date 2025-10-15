-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'custom',
    "source_id" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "total_cards" INTEGER NOT NULL DEFAULT 0,
    "cards_due" INTEGER NOT NULL DEFAULT 0,
    "cards_new" INTEGER NOT NULL DEFAULT 0,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardCard" (
    "id" SERIAL NOT NULL,
    "deck_id" INTEGER NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "front_content" TEXT NOT NULL,
    "back_content" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMP(3),
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardReview" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "time_spent" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardStudySession" (
    "id" SERIAL NOT NULL,
    "deck_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "cards_studied" INTEGER NOT NULL DEFAULT 0,
    "cards_correct" INTEGER NOT NULL DEFAULT 0,
    "cards_wrong" INTEGER NOT NULL DEFAULT 0,
    "total_time" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardStudySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardDeck_user_id_idx" ON "FlashcardDeck"("user_id");

-- CreateIndex
CREATE INDEX "FlashcardDeck_source_type_idx" ON "FlashcardDeck"("source_type");

-- CreateIndex
CREATE INDEX "FlashcardCard_deck_id_idx" ON "FlashcardCard"("deck_id");

-- CreateIndex
CREATE INDEX "FlashcardCard_next_review_at_idx" ON "FlashcardCard"("next_review_at");

-- CreateIndex
CREATE INDEX "FlashcardCard_kanji_id_idx" ON "FlashcardCard"("kanji_id");

-- CreateIndex
CREATE INDEX "FlashcardCard_is_new_idx" ON "FlashcardCard"("is_new");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardCard_deck_id_kanji_id_key" ON "FlashcardCard"("deck_id", "kanji_id");

-- CreateIndex
CREATE INDEX "FlashcardReview_card_id_idx" ON "FlashcardReview"("card_id");

-- CreateIndex
CREATE INDEX "FlashcardReview_session_id_idx" ON "FlashcardReview"("session_id");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_deck_id_idx" ON "FlashcardStudySession"("deck_id");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_user_id_idx" ON "FlashcardStudySession"("user_id");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_create_at_idx" ON "FlashcardStudySession"("create_at");

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "FlashcardCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "FlashcardStudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardStudySession" ADD CONSTRAINT "FlashcardStudySession_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardStudySession" ADD CONSTRAINT "FlashcardStudySession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
