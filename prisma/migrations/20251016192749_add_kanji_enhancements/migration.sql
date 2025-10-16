-- AlterTable
ALTER TABLE "Kanji" ADD COLUMN     "components" JSONB,
ADD COLUMN     "stroke_order" JSONB;

-- CreateTable
CREATE TABLE "KanjiExample" (
    "id" SERIAL NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "word_type" TEXT,
    "jlpt_level" INTEGER,
    "frequency" INTEGER,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiProgress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "times_reviewed" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed" TIMESTAMP(3),
    "first_learned" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mastered_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiList" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiListItem" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "notes" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanjiExample_kanji_id_idx" ON "KanjiExample"("kanji_id");

-- CreateIndex
CREATE INDEX "KanjiExample_jlpt_level_idx" ON "KanjiExample"("jlpt_level");

-- CreateIndex
CREATE INDEX "KanjiProgress_user_id_status_idx" ON "KanjiProgress"("user_id", "status");

-- CreateIndex
CREATE INDEX "KanjiProgress_kanji_id_idx" ON "KanjiProgress"("kanji_id");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiProgress_user_id_kanji_id_key" ON "KanjiProgress"("user_id", "kanji_id");

-- CreateIndex
CREATE INDEX "KanjiList_user_id_idx" ON "KanjiList"("user_id");

-- CreateIndex
CREATE INDEX "KanjiListItem_list_id_order_index_idx" ON "KanjiListItem"("list_id", "order_index");

-- CreateIndex
CREATE INDEX "KanjiListItem_kanji_id_idx" ON "KanjiListItem"("kanji_id");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiListItem_list_id_kanji_id_key" ON "KanjiListItem"("list_id", "kanji_id");

-- AddForeignKey
ALTER TABLE "KanjiExample" ADD CONSTRAINT "KanjiExample_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiProgress" ADD CONSTRAINT "KanjiProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiProgress" ADD CONSTRAINT "KanjiProgress_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiList" ADD CONSTRAINT "KanjiList_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListItem" ADD CONSTRAINT "KanjiListItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "KanjiList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListItem" ADD CONSTRAINT "KanjiListItem_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
