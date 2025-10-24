/*
  Warnings:

  - You are about to drop the column `question` on the `Question` table. All the data in the column will be lost.
  - Added the required column `questionText` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuizQuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuizQuestionType" ADD VALUE 'DRAWING';

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "question",
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "meanings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "questionText" TEXT NOT NULL;
