/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `KanjiCollections` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "KanjiCollections_name_key" ON "KanjiCollections"("name");
