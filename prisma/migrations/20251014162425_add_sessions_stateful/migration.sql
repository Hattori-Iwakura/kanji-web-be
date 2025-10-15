-- CreateTable
CREATE TABLE "Sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_token_key" ON "Sessions"("token");

-- CreateIndex
CREATE INDEX "Sessions_user_id_idx" ON "Sessions"("user_id");

-- CreateIndex
CREATE INDEX "Sessions_expire_at_idx" ON "Sessions"("expire_at");

-- CreateIndex
CREATE INDEX "Sessions_token_idx" ON "Sessions"("token");

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
