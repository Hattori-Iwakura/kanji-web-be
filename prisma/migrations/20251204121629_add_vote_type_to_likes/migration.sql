-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- AlterTable
ALTER TABLE "CommentLike" ADD COLUMN     "vote_type" "VoteType" NOT NULL DEFAULT 'UPVOTE';

-- AlterTable
ALTER TABLE "PostLike" ADD COLUMN     "vote_type" "VoteType" NOT NULL DEFAULT 'UPVOTE';

-- CreateIndex
CREATE INDEX "CommentLike_vote_type_idx" ON "CommentLike"("vote_type");

-- CreateIndex
CREATE INDEX "PostLike_vote_type_idx" ON "PostLike"("vote_type");
