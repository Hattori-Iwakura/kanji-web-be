// Clean Prisma Schema - Rebuild 2025-10-18
// Simplified architecture for Kanji Learning App

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum UserRole {
  ADMIN
  USER
}

enum QuizQuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_IN_BLANK
  DRAWING
}

enum QuizDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

// ==================== USER & AUTH ====================

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String?
  role         UserRole @default(USER)
  profileImage String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  lists                   KanjiList[]
  decks                   FlashcardDeck[]
  quizzes                 Quiz[]
  attempts                QuizAttempt[]
  sessions                FlashcardStudySession[]
  publishRequests         QuizPublishRequest[]
  reviewedPublishRequests QuizPublishRequest[]    @relation("ReviewedBy")

  @@index([email])
}

// ==================== KANJI ====================

model Kanji {
  id          Int      @id @default(autoincrement())
  character   String   @unique
  onyomi      String?
  kunyomi     String?
  meanings    String
  strokeCount Int?
  jlpt        Int?
  grade       Int?
  frequency   Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  listItems KanjiListItem[]
  cards     FlashcardCard[]

  @@index([character])
  @@index([jlpt])
  @@index([grade])
}

// ==================== CATEGORIES ====================

model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  kanjiLists KanjiList[]

  @@index([name])
}

// ==================== KANJI LISTS ====================

model KanjiList {
  id          Int      @id @default(autoincrement())
  userId      Int? // Nullable for system lists
  name        String
  description String?
  isPublic    Boolean  @default(false)
  categoryId  Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User?           @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category?       @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  items    KanjiListItem[]

  @@index([userId])
  @@index([isPublic])
  @@index([categoryId])
}

model KanjiListItem {
  id      Int      @id @default(autoincrement())
  listId  Int
  kanjiId Int
  order   Int      @default(0)
  notes   String?
  addedAt DateTime @default(now())

  list  KanjiList @relation(fields: [listId], references: [id], onDelete: Cascade)
  kanji Kanji     @relation(fields: [kanjiId], references: [id], onDelete: Cascade)

  @@unique([listId, kanjiId])
  @@index([listId, order])
}

// ==================== FLASHCARDS ====================

model FlashcardDeck {
  id          Int      @id @default(autoincrement())
  userId      Int
  name        String
  description String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards    FlashcardCard[]
  sessions FlashcardStudySession[]

  @@index([userId])
  @@index([isPublic])
}

model FlashcardCard {
  id           Int      @id @default(autoincrement())
  deckId       Int
  kanjiId      Int
  front        String
  back         String
  difficulty   Int      @default(0)
  nextReviewAt DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  deck    FlashcardDeck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  kanji   Kanji             @relation(fields: [kanjiId], references: [id], onDelete: Cascade)
  reviews FlashcardReview[]

  @@unique([deckId, kanjiId])
  @@index([deckId])
  @@index([nextReviewAt])
}

model FlashcardReview {
  id        Int      @id @default(autoincrement())
  cardId    Int
  sessionId Int
  rating    Int
  spentSec  Int      @default(0)
  createdAt DateTime @default(now())

  card    FlashcardCard         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  session FlashcardStudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([cardId])
  @@index([sessionId])
}

model FlashcardStudySession {
  id        Int      @id @default(autoincrement())
  deckId    Int
  userId    Int
  studied   Int      @default(0)
  correct   Int      @default(0)
  wrong     Int      @default(0)
  totalTime Int      @default(0)
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  deck    FlashcardDeck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  user    User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviews FlashcardReview[]

  @@index([deckId])
  @@index([userId])
}

// ==================== QUIZZES ====================

model Quiz {
  id          Int            @id @default(autoincrement())
  userId      Int
  title       String
  description String?
  difficulty  QuizDifficulty @default(BEGINNER)
  isPublic    Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions       Question[]
  attempts        QuizAttempt[]
  publishRequests QuizPublishRequest[]

  @@index([userId])
  @@index([isPublic])
  @@index([difficulty])
}

model Question {
  id            Int              @id @default(autoincrement())
  quizId        Int
  type          QuizQuestionType
  questionText  String
  correctAnswer String
  options       Json?
  explanation   String?
  points        Int              @default(10)
  meanings      String[]         @default([])
  order         Int              @default(0)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@index([quizId])
  @@index([order])
}

model QuizAttempt {
  id        Int      @id @default(autoincrement())
  userId    Int
  quizId    Int
  score     Int      @default(0)
  maxScore  Int      @default(0)
  completed Boolean  @default(false)
  createdAt DateTime @default(now())

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers QuizAnswer[]

  @@index([userId])
  @@index([quizId])
}

model QuizAnswer {
  id         Int      @id @default(autoincrement())
  attemptId  Int
  questionId Int
  userAnswer String
  isCorrect  Boolean  @default(false)
  points     Int      @default(0)
  createdAt  DateTime @default(now())

  attempt  QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([attemptId])
  @@index([questionId])
}

// ==================== PUBLISH REQUESTS ====================

model KanjiListPublishRequest {
  id         Int       @id @default(autoincrement())
  listId     Int
  userId     Int
  message    String?
  status     String    @default("pending") // pending, approved, rejected
  reviewedBy Int?
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([listId])
  @@index([userId])
  @@index([status])
}

model FlashcardDeckPublishRequest {
  id         Int       @id @default(autoincrement())
  deckId     Int
  userId     Int
  message    String?
  status     String    @default("pending")
  reviewedBy Int?
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([deckId])
  @@index([userId])
  @@index([status])
}

model QuizPublishRequest {
  id         Int       @id @default(autoincrement())
  quizId     Int
  userId     Int
  message    String?
  status     String    @default("pending")
  reviewedBy Int?
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  quiz     Quiz  @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user     User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewer User? @relation("ReviewedBy", fields: [reviewedBy], references: [id], onDelete: SetNull)

  @@index([quizId])
  @@index([userId])
  @@index([status])
}
