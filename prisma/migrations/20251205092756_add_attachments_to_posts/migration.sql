-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
