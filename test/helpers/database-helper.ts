import { PrismaService } from '../../src/shared/services/prisma.service';
import { INestApplication } from '@nestjs/common';

/**
 * Helper class for database operations in tests
 */
export class DatabaseHelper {
  constructor(private prisma: PrismaService) {}

  /**
   * Clean all test data from database
   */
  async cleanup(): Promise<void> {
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
        await this.prisma.$executeRawUnsafe(
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
  async resetSequences(): Promise<void> {
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
        await this.prisma.$executeRawUnsafe(
          `ALTER SEQUENCE "${sequence}" RESTART WITH 1;`,
        );
      } catch (error) {
        // Sequence might not exist, ignore
      }
    }
  }

  /**
   * Seed basic test data (kanji, categories)
   */
  async seedBasicData(): Promise<void> {
    // Create basic categories
    await this.prisma.category.createMany({
      data: [
        { name: 'N5 Basic', description: 'N5 level kanji' },
        { name: 'N4 Intermediate', description: 'N4 level kanji' },
        { name: 'Common Words', description: 'Common vocabulary' },
      ],
      skipDuplicates: true,
    });

    // Create some basic kanji for testing
    const basicKanji = [
      { character: '日', meanings: 'day, sun', onyomi: 'ニチ、ジツ', kunyomi: 'ひ、か', jlpt: 5, grade: 1 },
      { character: '月', meanings: 'month, moon', onyomi: 'ゲツ、ガツ', kunyomi: 'つき', jlpt: 5, grade: 1 },
      { character: '火', meanings: 'fire', onyomi: 'カ', kunyomi: 'ひ', jlpt: 5, grade: 1 },
      { character: '水', meanings: 'water', onyomi: 'スイ', kunyomi: 'みず', jlpt: 5, grade: 1 },
      { character: '木', meanings: 'tree, wood', onyomi: 'モク、ボク', kunyomi: 'き', jlpt: 5, grade: 1 },
    ];

    for (const kanji of basicKanji) {
      try {
        await this.prisma.kanji.create({
          data: {
            ...kanji,
            strokeCount: 4,
          },
        });
      } catch (error) {
        // Skip if already exists
      }
    }
  }

  /**
   * Run transaction for test isolation
   */
  async runInTransaction<T>(
    callback: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await callback(tx as PrismaService);
    });
  }

  /**
   * Get count of records in a table
   */
  async getTableCount(tableName: string): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    );
    return Number(result[0].count);
  }

  /**
   * Check if database is empty (for test isolation)
   */
  async isDatabaseEmpty(): Promise<boolean> {
    const userCount = await this.getTableCount('User');
    const kanjiCount = await this.getTableCount('Kanji');
    return userCount === 0 && kanjiCount === 0;
  }
}

/**
 * Create database helper instance
 */
export function createDatabaseHelper(
  app: INestApplication,
): DatabaseHelper {
  const prisma = app.get(PrismaService);
  return new DatabaseHelper(prisma);
}
