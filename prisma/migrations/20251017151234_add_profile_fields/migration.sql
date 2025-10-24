-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "name" TEXT;
