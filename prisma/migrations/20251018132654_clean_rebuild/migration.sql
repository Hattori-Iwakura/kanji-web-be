/*
  Warnings:

  - The values [EXPERT] on the enum `QuizDifficulty` will be removed. If these variants are still used in the database, this will fail.
  - The values [DRAWING] on the enum `QuizQuestionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `back_content` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `deck_id` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `ease_factor` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `front_content` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `interval_days` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `is_new` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `kanji_id` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `last_reviewed_at` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `next_review_at` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `order_index` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `repetitions` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `FlashcardCard` table. All the data in the column will be lost.
  - You are about to drop the column `cards_due` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `cards_new` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `is_public` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `is_temporary` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `source_type` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `total_cards` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `FlashcardDeck` table. All the data in the column will be lost.
  - You are about to drop the column `card_id` on the `FlashcardReview` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `FlashcardReview` table. All the data in the column will be lost.
  - You are about to drop the column `session_id` on the `FlashcardReview` table. All the data in the column will be lost.
  - You are about to drop the column `time_spent` on the `FlashcardReview` table. All the data in the column will be lost.
  - You are about to drop the column `card_order` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `cards_correct` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `cards_studied` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `cards_total` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `cards_wrong` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `current_index` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `deck_id` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `paused_at` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `total_time` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `FlashcardStudySession` table. All the data in the column will be lost.
  - You are about to drop the column `components` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `meaning_explanations` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `radicals` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `stroke_count` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `stroke_order` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `Kanji` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `KanjiList` table. All the data in the column will be lost.
  - You are about to drop the column `is_public` on the `KanjiList` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `KanjiList` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `KanjiList` table. All the data in the column will be lost.
  - You are about to drop the column `added_at` on the `KanjiListItem` table. All the data in the column will be lost.
  - You are about to drop the column `kanji_id` on the `KanjiListItem` table. All the data in the column will be lost.
  - You are about to drop the column `list_id` on the `KanjiListItem` table. All the data in the column will be lost.
  - You are about to drop the column `order_index` on the `KanjiListItem` table. All the data in the column will be lost.
  - You are about to drop the column `correct_answer` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `explanation` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `order_index` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `quiz_id` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `time_limit` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `is_public` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `answered_at` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `attempt_id` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `is_correct` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `question_id` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `time_spent` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `user_answer` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `is_completed` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `max_score` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `quiz_id` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `time_spent` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the `Achievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiCollectionItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiCollections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiExample` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KanjiProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TwoFactorAuth` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserAchievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[deckId,kanjiId]` on the table `FlashcardCard` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[listId,kanjiId]` on the table `KanjiListItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `back` to the `FlashcardCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deckId` to the `FlashcardCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `front` to the `FlashcardCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kanjiId` to the `FlashcardCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FlashcardCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FlashcardDeck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `FlashcardDeck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardId` to the `FlashcardReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `FlashcardReview` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deckId` to the `FlashcardStudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FlashcardStudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `FlashcardStudySession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Kanji` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `KanjiList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `KanjiList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kanjiId` to the `KanjiListItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `listId` to the `KanjiListItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correctAnswer` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quizId` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attemptId` to the `QuizAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionId` to the `QuizAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAnswer` to the `QuizAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quizId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuizDifficulty_new" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
ALTER TABLE "public"."Quiz" ALTER COLUMN "difficulty" DROP DEFAULT;
ALTER TABLE "Quiz" ALTER COLUMN "difficulty" TYPE "QuizDifficulty_new" USING ("difficulty"::text::"QuizDifficulty_new");
ALTER TYPE "QuizDifficulty" RENAME TO "QuizDifficulty_old";
ALTER TYPE "QuizDifficulty_new" RENAME TO "QuizDifficulty";
DROP TYPE "public"."QuizDifficulty_old";
ALTER TABLE "Quiz" ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "QuizQuestionType_new" AS ENUM ('MULTIPLE_CHOICE', 'FILL_IN_BLANK');
ALTER TABLE "Question" ALTER COLUMN "type" TYPE "QuizQuestionType_new" USING ("type"::text::"QuizQuestionType_new");
ALTER TYPE "QuizQuestionType" RENAME TO "QuizQuestionType_old";
ALTER TYPE "QuizQuestionType_new" RENAME TO "QuizQuestionType";
DROP TYPE "public"."QuizQuestionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."FlashcardCard" DROP CONSTRAINT "FlashcardCard_deck_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardCard" DROP CONSTRAINT "FlashcardCard_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardDeck" DROP CONSTRAINT "FlashcardDeck_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardReview" DROP CONSTRAINT "FlashcardReview_card_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardReview" DROP CONSTRAINT "FlashcardReview_session_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardStudySession" DROP CONSTRAINT "FlashcardStudySession_deck_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."FlashcardStudySession" DROP CONSTRAINT "FlashcardStudySession_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiCollectionItems" DROP CONSTRAINT "KanjiCollectionItems_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiCollectionItems" DROP CONSTRAINT "KanjiCollectionItems_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiCollections" DROP CONSTRAINT "KanjiCollections_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiExample" DROP CONSTRAINT "KanjiExample_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiList" DROP CONSTRAINT "KanjiList_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiListItem" DROP CONSTRAINT "KanjiListItem_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiListItem" DROP CONSTRAINT "KanjiListItem_list_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiProgress" DROP CONSTRAINT "KanjiProgress_kanji_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."KanjiProgress" DROP CONSTRAINT "KanjiProgress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."NotificationPreference" DROP CONSTRAINT "NotificationPreference_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Quiz" DROP CONSTRAINT "Quiz_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizAnswer" DROP CONSTRAINT "QuizAnswer_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizAnswer" DROP CONSTRAINT "QuizAnswer_question_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizAttempt" DROP CONSTRAINT "QuizAttempt_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizAttempt" DROP CONSTRAINT "QuizAttempt_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."TwoFactorAuth" DROP CONSTRAINT "TwoFactorAuth_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAchievement" DROP CONSTRAINT "UserAchievement_achievement_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAchievement" DROP CONSTRAINT "UserAchievement_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSession" DROP CONSTRAINT "UserSession_userId_fkey";

-- DropIndex
DROP INDEX "public"."FlashcardCard_deck_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardCard_deck_id_kanji_id_key";

-- DropIndex
DROP INDEX "public"."FlashcardCard_is_new_idx";

-- DropIndex
DROP INDEX "public"."FlashcardCard_kanji_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardCard_next_review_at_idx";

-- DropIndex
DROP INDEX "public"."FlashcardCard_order_index_idx";

-- DropIndex
DROP INDEX "public"."FlashcardDeck_is_temporary_expires_at_idx";

-- DropIndex
DROP INDEX "public"."FlashcardDeck_source_type_idx";

-- DropIndex
DROP INDEX "public"."FlashcardDeck_user_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardReview_card_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardReview_session_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardStudySession_create_at_idx";

-- DropIndex
DROP INDEX "public"."FlashcardStudySession_deck_id_idx";

-- DropIndex
DROP INDEX "public"."FlashcardStudySession_user_id_idx";

-- DropIndex
DROP INDEX "public"."KanjiList_user_id_idx";

-- DropIndex
DROP INDEX "public"."KanjiListItem_kanji_id_idx";

-- DropIndex
DROP INDEX "public"."KanjiListItem_list_id_kanji_id_key";

-- DropIndex
DROP INDEX "public"."KanjiListItem_list_id_order_index_idx";

-- DropIndex
DROP INDEX "public"."Question_order_index_idx";

-- DropIndex
DROP INDEX "public"."Question_quiz_id_idx";

-- DropIndex
DROP INDEX "public"."Question_type_idx";

-- DropIndex
DROP INDEX "public"."Quiz_category_idx";

-- DropIndex
DROP INDEX "public"."Quiz_is_public_idx";

-- DropIndex
DROP INDEX "public"."Quiz_user_id_idx";

-- DropIndex
DROP INDEX "public"."QuizAnswer_attempt_id_idx";

-- DropIndex
DROP INDEX "public"."QuizAnswer_is_correct_idx";

-- DropIndex
DROP INDEX "public"."QuizAnswer_question_id_idx";

-- DropIndex
DROP INDEX "public"."QuizAttempt_is_completed_idx";

-- DropIndex
DROP INDEX "public"."QuizAttempt_quiz_id_idx";

-- DropIndex
DROP INDEX "public"."QuizAttempt_started_at_idx";

-- DropIndex
DROP INDEX "public"."QuizAttempt_user_id_idx";

-- AlterTable
ALTER TABLE "FlashcardCard" DROP COLUMN "back_content",
DROP COLUMN "create_at",
DROP COLUMN "deck_id",
DROP COLUMN "ease_factor",
DROP COLUMN "front_content",
DROP COLUMN "interval_days",
DROP COLUMN "is_new",
DROP COLUMN "kanji_id",
DROP COLUMN "last_reviewed_at",
DROP COLUMN "next_review_at",
DROP COLUMN "order_index",
DROP COLUMN "repetitions",
DROP COLUMN "update_at",
ADD COLUMN     "back" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deckId" INTEGER NOT NULL,
ADD COLUMN     "front" TEXT NOT NULL,
ADD COLUMN     "kanjiId" INTEGER NOT NULL,
ADD COLUMN     "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FlashcardDeck" DROP COLUMN "cards_due",
DROP COLUMN "cards_new",
DROP COLUMN "create_at",
DROP COLUMN "expires_at",
DROP COLUMN "is_public",
DROP COLUMN "is_temporary",
DROP COLUMN "source_id",
DROP COLUMN "source_type",
DROP COLUMN "total_cards",
DROP COLUMN "update_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FlashcardReview" DROP COLUMN "card_id",
DROP COLUMN "create_at",
DROP COLUMN "session_id",
DROP COLUMN "time_spent",
ADD COLUMN     "cardId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sessionId" INTEGER NOT NULL,
ADD COLUMN     "spentSec" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FlashcardStudySession" DROP COLUMN "card_order",
DROP COLUMN "cards_correct",
DROP COLUMN "cards_studied",
DROP COLUMN "cards_total",
DROP COLUMN "cards_wrong",
DROP COLUMN "completed_at",
DROP COLUMN "create_at",
DROP COLUMN "current_index",
DROP COLUMN "deck_id",
DROP COLUMN "paused_at",
DROP COLUMN "settings",
DROP COLUMN "status",
DROP COLUMN "total_time",
DROP COLUMN "update_at",
DROP COLUMN "user_id",
ADD COLUMN     "correct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deckId" INTEGER NOT NULL,
ADD COLUMN     "studied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "wrong" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Kanji" DROP COLUMN "components",
DROP COLUMN "create_at",
DROP COLUMN "meaning_explanations",
DROP COLUMN "radicals",
DROP COLUMN "stroke_count",
DROP COLUMN "stroke_order",
DROP COLUMN "update_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "strokeCount" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "KanjiList" DROP COLUMN "create_at",
DROP COLUMN "is_public",
DROP COLUMN "update_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "KanjiListItem" DROP COLUMN "added_at",
DROP COLUMN "kanji_id",
DROP COLUMN "list_id",
DROP COLUMN "order_index",
ADD COLUMN     "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "kanjiId" INTEGER NOT NULL,
ADD COLUMN     "listId" INTEGER NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "correct_answer",
DROP COLUMN "create_at",
DROP COLUMN "explanation",
DROP COLUMN "metadata",
DROP COLUMN "order_index",
DROP COLUMN "points",
DROP COLUMN "quiz_id",
DROP COLUMN "time_limit",
DROP COLUMN "update_at",
ADD COLUMN     "correctAnswer" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "category",
DROP COLUMN "create_at",
DROP COLUMN "is_public",
DROP COLUMN "tags",
DROP COLUMN "update_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "QuizAnswer" DROP COLUMN "answered_at",
DROP COLUMN "attempt_id",
DROP COLUMN "is_correct",
DROP COLUMN "metadata",
DROP COLUMN "question_id",
DROP COLUMN "time_spent",
DROP COLUMN "user_answer",
ADD COLUMN     "attemptId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCorrect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionId" INTEGER NOT NULL,
ADD COLUMN     "userAnswer" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "completed_at",
DROP COLUMN "is_completed",
DROP COLUMN "max_score",
DROP COLUMN "quiz_id",
DROP COLUMN "started_at",
DROP COLUMN "time_spent",
DROP COLUMN "user_id",
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."Achievement";

-- DropTable
DROP TABLE "public"."KanjiCollectionItems";

-- DropTable
DROP TABLE "public"."KanjiCollections";

-- DropTable
DROP TABLE "public"."KanjiExample";

-- DropTable
DROP TABLE "public"."KanjiProgress";

-- DropTable
DROP TABLE "public"."Notification";

-- DropTable
DROP TABLE "public"."NotificationPreference";

-- DropTable
DROP TABLE "public"."PasswordResetToken";

-- DropTable
DROP TABLE "public"."TwoFactorAuth";

-- DropTable
DROP TABLE "public"."UserAchievement";

-- DropTable
DROP TABLE "public"."UserSession";

-- DropTable
DROP TABLE "public"."Users";

-- DropEnum
DROP TYPE "public"."AchievementCategory";

-- DropEnum
DROP TYPE "public"."NotificationType";

-- DropEnum
DROP TYPE "public"."StudySessionStatus";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiListPublishRequest" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiListPublishRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardDeckPublishRequest" (
    "id" SERIAL NOT NULL,
    "deckId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardDeckPublishRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizPublishRequest" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizPublishRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "KanjiListPublishRequest_listId_idx" ON "KanjiListPublishRequest"("listId");

-- CreateIndex
CREATE INDEX "KanjiListPublishRequest_userId_idx" ON "KanjiListPublishRequest"("userId");

-- CreateIndex
CREATE INDEX "KanjiListPublishRequest_status_idx" ON "KanjiListPublishRequest"("status");

-- CreateIndex
CREATE INDEX "FlashcardDeckPublishRequest_deckId_idx" ON "FlashcardDeckPublishRequest"("deckId");

-- CreateIndex
CREATE INDEX "FlashcardDeckPublishRequest_userId_idx" ON "FlashcardDeckPublishRequest"("userId");

-- CreateIndex
CREATE INDEX "FlashcardDeckPublishRequest_status_idx" ON "FlashcardDeckPublishRequest"("status");

-- CreateIndex
CREATE INDEX "QuizPublishRequest_quizId_idx" ON "QuizPublishRequest"("quizId");

-- CreateIndex
CREATE INDEX "QuizPublishRequest_userId_idx" ON "QuizPublishRequest"("userId");

-- CreateIndex
CREATE INDEX "QuizPublishRequest_status_idx" ON "QuizPublishRequest"("status");

-- CreateIndex
CREATE INDEX "FlashcardCard_deckId_idx" ON "FlashcardCard"("deckId");

-- CreateIndex
CREATE INDEX "FlashcardCard_nextReviewAt_idx" ON "FlashcardCard"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardCard_deckId_kanjiId_key" ON "FlashcardCard"("deckId", "kanjiId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_isPublic_idx" ON "FlashcardDeck"("isPublic");

-- CreateIndex
CREATE INDEX "FlashcardReview_cardId_idx" ON "FlashcardReview"("cardId");

-- CreateIndex
CREATE INDEX "FlashcardReview_sessionId_idx" ON "FlashcardReview"("sessionId");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_deckId_idx" ON "FlashcardStudySession"("deckId");

-- CreateIndex
CREATE INDEX "FlashcardStudySession_userId_idx" ON "FlashcardStudySession"("userId");

-- CreateIndex
CREATE INDEX "Kanji_character_idx" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "Kanji_jlpt_idx" ON "Kanji"("jlpt");

-- CreateIndex
CREATE INDEX "Kanji_grade_idx" ON "Kanji"("grade");

-- CreateIndex
CREATE INDEX "KanjiList_userId_idx" ON "KanjiList"("userId");

-- CreateIndex
CREATE INDEX "KanjiList_isPublic_idx" ON "KanjiList"("isPublic");

-- CreateIndex
CREATE INDEX "KanjiListItem_listId_order_idx" ON "KanjiListItem"("listId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiListItem_listId_kanjiId_key" ON "KanjiListItem"("listId", "kanjiId");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE INDEX "Question_order_idx" ON "Question"("order");

-- CreateIndex
CREATE INDEX "Quiz_userId_idx" ON "Quiz"("userId");

-- CreateIndex
CREATE INDEX "Quiz_isPublic_idx" ON "Quiz"("isPublic");

-- CreateIndex
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- AddForeignKey
ALTER TABLE "KanjiList" ADD CONSTRAINT "KanjiList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListItem" ADD CONSTRAINT "KanjiListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "KanjiList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListItem" ADD CONSTRAINT "KanjiListItem_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardCard" ADD CONSTRAINT "FlashcardCard_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "FlashcardCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FlashcardStudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardStudySession" ADD CONSTRAINT "FlashcardStudySession_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardStudySession" ADD CONSTRAINT "FlashcardStudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
