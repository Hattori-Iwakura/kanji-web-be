import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/shared/services/prisma.service';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

/**
 * Setup test application with all modules and configurations
 */
export async function setupTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same configuration as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * Cleanup test database - remove all test data
 */
export async function cleanupDatabase(prisma: PrismaService): Promise<void> {
  // Delete in correct order to avoid foreign key constraints
  const tablenames = [
    'QuizAnswer',
    'QuizAttempt',
    'Question',
    'Quiz',
    'QuizPublishRequest',
    'FlashcardReview',
    'SessionCard',
    'FlashcardStudySession',
    'FlashcardCard',
    'FlashcardDeck',
    'FlashcardDeckPublishRequest',
    'KanjiListItem',
    'KanjiList',
    'KanjiListPublishRequest',
    'TwoFactorOtp',
    'TwoFactorAuth',
    'PasswordResetToken',
    'Category',
    'Kanji',
    'User',
  ];

  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`,
      );
    } catch (error) {
      const err = error as Error;
      console.log(`Warning: Could not truncate ${tablename}`, err.message);
    }
  }
}

/**
 * Reset database sequences
 */
export async function resetSequences(prisma: PrismaService): Promise<void> {
  const sequences = [
    'User_id_seq',
    'Kanji_id_seq',
    'KanjiList_id_seq',
    'Quiz_id_seq',
    'FlashcardDeck_id_seq',
    'Category_id_seq',
  ];

  for (const sequence of sequences) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE "${sequence}" RESTART WITH 1;`,
      );
    } catch (error) {
      // Sequence might not exist, ignore
    }
  }
}

/**
 * Close test application and database connections
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$disconnect();
  await app.close();
}

/**
 * Get Prisma service from app
 */
export function getPrismaService(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}
