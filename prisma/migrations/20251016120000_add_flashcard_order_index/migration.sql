-- AlterTable
ALTER TABLE "FlashcardCard"
ADD "order_index" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing cards so ordering matches creation order per deck
WITH
    ordered_cards
    AS
    (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY deck_id ORDER BY create_at) - 1 AS rn
        FROM "FlashcardCard"
    )
UPDATE "FlashcardCard"
SET order_index = ordered_cards.rn
FROM ordered_cards
WHERE "FlashcardCard".id = ordered_cards.id;

-- CreateIndex
CREATE INDEX "FlashcardCard_order_index_idx" ON "FlashcardCard"("order_index");
