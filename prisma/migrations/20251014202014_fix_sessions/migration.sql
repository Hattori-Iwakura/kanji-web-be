/*
  Warnings:

  - You are about to drop the `Sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Sessions" DROP CONSTRAINT "Sessions_user_id_fkey";

-- DropTable
DROP TABLE "public"."Sessions";

-- CreateTable
CREATE TABLE "UserSessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token" TEXT,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSessions_token_key" ON "UserSessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserSessions_refresh_token_key" ON "UserSessions"("refresh_token");

-- CreateIndex
CREATE INDEX "UserSessions_user_id_idx" ON "UserSessions"("user_id");

-- CreateIndex
CREATE INDEX "UserSessions_expire_at_idx" ON "UserSessions"("expire_at");

-- CreateIndex
CREATE INDEX "UserSessions_token_idx" ON "UserSessions"("token");

-- AddForeignKey
ALTER TABLE "UserSessions" ADD CONSTRAINT "UserSessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
