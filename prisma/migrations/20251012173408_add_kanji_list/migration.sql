/*
  Warnings:

  - You are about to drop the column `kanjiLevelsId` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the `KanjiCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiCategoryMappings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiLevels` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Kanji" DROP CONSTRAINT "Kanji_kanjiLevelsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiCategoryMappings" DROP CONSTRAINT "KanjiCategoryMappings_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiCategoryMappings" DROP CONSTRAINT "KanjiCategoryMappings_kanji_id_fkey";

-- AlterTable
ALTER TABLE "Kanji" DROP COLUMN "kanjiLevelsId";

-- DropTable
DROP TABLE "public"."KanjiCategories";

-- DropTable
DROP TABLE "public"."KanjiCategoryMappings";

-- DropTable
DROP TABLE "public"."KanjiLevels";

-- CreateTable
CREATE TABLE "KanjiCollections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "collection_type" TEXT NOT NULL DEFAULT 'custom',
    "metadata" JSONB,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiCollections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiCollectionItems" (
    "id" SERIAL NOT NULL,
    "collection_id" INTEGER NOT NULL,
    "kanji_id" INTEGER NOT NULL,
    "order_index" INTEGER,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiCollectionItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KanjiCollections_user_id_idx" ON "KanjiCollections"("user_id");

-- CreateIndex
CREATE INDEX "KanjiCollections_collection_type_idx" ON "KanjiCollections"("collection_type");

-- CreateIndex
CREATE INDEX "KanjiCollectionItems_collection_id_idx" ON "KanjiCollectionItems"("collection_id");

-- CreateIndex
CREATE INDEX "KanjiCollectionItems_kanji_id_idx" ON "KanjiCollectionItems"("kanji_id");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiCollectionItems_collection_id_kanji_id_key" ON "KanjiCollectionItems"("collection_id", "kanji_id");

-- AddForeignKey
ALTER TABLE "KanjiCollections" ADD CONSTRAINT "KanjiCollections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiCollectionItems" ADD CONSTRAINT "KanjiCollectionItems_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "KanjiCollections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiCollectionItems" ADD CONSTRAINT "KanjiCollectionItems_kanji_id_fkey" FOREIGN KEY ("kanji_id") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
