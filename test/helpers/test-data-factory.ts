import { PrismaService } from '../../src/shared/services/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Factory to create test users
 */
export class UserFactory {
  constructor(private prisma: PrismaService) {}

  async createUser(data?: {
    email?: string;
    password?: string;
    name?: string;
    role?: 'USER' | 'ADMIN';
  }) {
    const defaultPassword = 'TestPassword123!@#';
    const hashedPassword = await bcrypt.hash(
      data?.password || defaultPassword,
      10,
    );

    return this.prisma.user.create({
      data: {
        email: data?.email || `test-${Date.now()}@example.com`,
        passwordHash: hashedPassword,
        name: data?.name || 'Test User',
        role: data?.role || 'USER',
      },
    });
  }

  async createAdminUser(data?: {
    email?: string;
    password?: string;
    name?: string;
  }) {
    return this.createUser({ ...data, role: 'ADMIN' });
  }
}

/**
 * Factory to create test kanji
 */
export class KanjiFactory {
  constructor(private prisma: PrismaService) {}

  async createKanji(data?: {
    character?: string;
    meanings?: string;
    onyomi?: string;
    kunyomi?: string;
    jlpt?: number;
    grade?: number;
    strokeCount?: number;
  }) {
    // Use timestamp + random to ensure uniqueness
    const uniqueSuffix = Date.now() + Math.floor(Math.random() * 1000);
    const randomChar = data?.character || `TEST_${uniqueSuffix}`;
    
    // Use upsert to avoid unique constraint errors when same character is used in multiple tests
    return this.prisma.kanji.upsert({
      where: { character: randomChar },
      update: {}, // Don't update if exists, just return existing
      create: {
        character: randomChar,
        meanings: data?.meanings || 'Test meaning',
        onyomi: data?.onyomi || 'テスト',
        kunyomi: data?.kunyomi || 'てすと',
        jlpt: data?.jlpt || 5,
        grade: data?.grade || 1,
        strokeCount: data?.strokeCount || 5,
      },
    });
  }

  async createMultipleKanji(count: number) {
    const kanji: any[] = [];
    for (let i = 0; i < count; i++) {
      kanji.push(await this.createKanji());
    }
    return kanji;
  }
}

/**
 * Factory to create test kanji lists
 */
export class KanjiListFactory {
  constructor(private prisma: PrismaService) {}

  async createKanjiList(
    userId: number,
    data?: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      categoryId?: number;
    },
  ) {
    return this.prisma.kanjiList.create({
      data: {
        name: data?.name || `Test List ${Date.now()}`,
        description: data?.description || 'Test description',
        isPublic: data?.isPublic || false,
        userId,
        categoryId: data?.categoryId,
      },
    });
  }

  async addKanjiToList(listId: number, kanjiId: number, order: number = 1) {
    return this.prisma.kanjiListItem.create({
      data: {
        listId,
        kanjiId,
        order,
      },
    });
  }
}

/**
 * Factory to create test flashcard decks
 */
export class FlashcardDeckFactory {
  constructor(private prisma: PrismaService) {}

  async createDeck(
    userId: number,
    data?: {
      name?: string;
      description?: string;
      isPublic?: boolean;
    },
  ) {
    return this.prisma.flashcardDeck.create({
      data: {
        name: data?.name || `Test Deck ${Date.now()}`,
        description: data?.description || 'Test deck description',
        isPublic: data?.isPublic || false,
        userId,
      },
    });
  }

  async addCardToDeck(deckId: number, kanjiId: number, front?: string, back?: string) {
    return this.prisma.flashcardCard.create({
      data: {
        deckId,
        kanjiId,
        front: front || 'Front content',
        back: back || 'Back content',
      },
    });
  }
}

/**
 * Factory to create test quizzes
 */
export class QuizFactory {
  constructor(private prisma: PrismaService) {}

  async createQuiz(
    userId: number,
    data?: {
      title?: string;
      description?: string;
      difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      isPublic?: boolean;
    },
  ) {
    return this.prisma.quiz.create({
      data: {
        title: data?.title || `Test Quiz ${Date.now()}`,
        description: data?.description || 'Test quiz description',
        difficulty: data?.difficulty || 'BEGINNER',
        isPublic: data?.isPublic || false,
        userId,
      },
    });
  }

  async addQuestion(
    quizId: number,
    data?: {
      questionText?: string;
      type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'DRAWING';
      options?: any;
      correctAnswer?: string;
      order?: number;
    },
  ) {
    return this.prisma.question.create({
      data: {
        quizId,
        questionText: data?.questionText || 'Test question?',
        type: data?.type || 'MULTIPLE_CHOICE',
        options: data?.options || ['Option 1', 'Option 2', 'Option 3'],
        correctAnswer: data?.correctAnswer || 'Option 1',
        order: data?.order || 1,
        points: 10,
      },
    });
  }
}

/**
 * Factory to create test categories
 */
export class CategoryFactory {
  constructor(private prisma: PrismaService) {}

  async createCategory(data?: { name?: string; description?: string }) {
    return this.prisma.category.create({
      data: {
        name: data?.name || `Test Category ${Date.now()}`,
        description: data?.description || 'Test category description',
      },
    });
  }
}

/**
 * Main factory class that combines all factories
 */
export class TestDataFactory {
  public users: UserFactory;
  public kanji: KanjiFactory;
  public kanjiLists: KanjiListFactory;
  public flashcardDecks: FlashcardDeckFactory;
  public quizzes: QuizFactory;
  public categories: CategoryFactory;

  constructor(prisma: PrismaService) {
    this.users = new UserFactory(prisma);
    this.kanji = new KanjiFactory(prisma);
    this.kanjiLists = new KanjiListFactory(prisma);
    this.flashcardDecks = new FlashcardDeckFactory(prisma);
    this.quizzes = new QuizFactory(prisma);
    this.categories = new CategoryFactory(prisma);
  }
}
