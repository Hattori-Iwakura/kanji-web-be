-- CreateTable
CREATE TABLE "KanjiTable" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiTableItem" (
    "id" SERIAL NOT NULL,
    "table_id" INTEGER NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiTableItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanjiTable_user_id_idx" ON "KanjiTable"("user_id");

-- CreateIndex
CREATE INDEX "KanjiTable_create_at_idx" ON "KanjiTable"("create_at");

-- CreateIndex
CREATE INDEX "KanjiTableItem_table_id_idx" ON "KanjiTableItem"("table_id");

-- CreateIndex
CREATE INDEX "KanjiTableItem_kanji_id_idx" ON "KanjiTableItem"("kanji_id");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiTableItem_table_id_kanji_id_key" ON "KanjiTableItem"("table_id", "kanji_id");

-- AddForeignKey
ALTER TABLE "KanjiTable" ADD CONSTRAINT "KanjiTable_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiTableItem" ADD CONSTRAINT "KanjiTableItem_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "KanjiTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiTableItem" ADD CONSTRAINT "KanjiTableItem_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
