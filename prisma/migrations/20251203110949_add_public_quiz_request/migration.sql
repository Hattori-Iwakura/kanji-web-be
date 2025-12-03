-- CreateEnum
CREATE TYPE "PublicQuizRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PublicQuizRequest" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PublicQuizRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicQuizRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicQuizRequest_quiz_id_idx" ON "PublicQuizRequest"("quiz_id");

-- CreateIndex
CREATE INDEX "PublicQuizRequest_user_id_idx" ON "PublicQuizRequest"("user_id");

-- CreateIndex
CREATE INDEX "PublicQuizRequest_status_idx" ON "PublicQuizRequest"("status");

-- AddForeignKey
ALTER TABLE "PublicQuizRequest" ADD CONSTRAINT "PublicQuizRequest_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicQuizRequest" ADD CONSTRAINT "PublicQuizRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicQuizRequest" ADD CONSTRAINT "PublicQuizRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
