-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "account" TEXT NOT NULL,
    "hash_password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profile_image" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" SERIAL NOT NULL,
    "character" TEXT NOT NULL,
    "onyomi" TEXT,
    "kunyomi" TEXT,
    "meanings" TEXT NOT NULL,
    "stroke_count" INTEGER,
    "jlpt" INTEGER,
    "grade" INTEGER,
    "frequency" INTEGER,
    "radicals" TEXT,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_account_key" ON "Users"("account");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_character_key" ON "Kanji"("character");
