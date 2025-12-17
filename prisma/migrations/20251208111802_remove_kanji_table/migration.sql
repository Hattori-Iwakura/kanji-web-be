/*
  Warnings:

  - You are about to drop the `KanjiTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiTableItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."KanjiTable" DROP CONSTRAINT "KanjiTable_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiTableItem" DROP CONSTRAINT "KanjiTableItem_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiTableItem" DROP CONSTRAINT "KanjiTableItem_table_id_fkey";

-- DropTable
DROP TABLE "public"."KanjiTable";

-- DropTable
DROP TABLE "public"."KanjiTableItem";
