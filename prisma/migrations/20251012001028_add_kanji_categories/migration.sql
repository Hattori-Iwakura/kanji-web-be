-- AlterTable
ALTER TABLE "Kanji" ADD COLUMN     "kanjiLevelsId" INTEGER;

-- CreateTable
CREATE TABLE "KanjiCategories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiLevels" (
    "id" SERIAL NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiLevels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiCategoryMappings" (
    "id" SERIAL NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiCategoryMappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KanjiCategories_name_key" ON "KanjiCategories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiLevels_level_key" ON "KanjiLevels"("level");

-- CreateIndex
CREATE INDEX "KanjiCategoryMappings_category_id_idx" ON "KanjiCategoryMappings"("category_id");

-- CreateIndex
CREATE INDEX "KanjiCategoryMappings_kanji_id_idx" ON "KanjiCategoryMappings"("kanji_id");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiCategoryMappings_kanji_id_category_id_key" ON "KanjiCategoryMappings"("kanji_id", "category_id");

-- AddForeignKey
ALTER TABLE "Kanji" ADD CONSTRAINT "Kanji_kanjiLevelsId_fkey" FOREIGN KEY ("kanjiLevelsId") REFERENCES "KanjiLevels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiCategoryMappings" ADD CONSTRAINT "KanjiCategoryMappings_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiCategoryMappings" ADD CONSTRAINT "KanjiCategoryMappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "KanjiCategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
