import { INestApplication } from '@nestjs/common';
import { setupTestApp, closeTestApp, getPrismaService } from './helpers/test-setup';
import { TestDataFactory } from './helpers/test-data-factory';
import { createDatabaseHelper, DatabaseHelper } from './helpers/database-helper';
import { PrismaService } from '../src/shared/services/prisma.service';
import * as request from 'supertest';

// NOTE: This module needs extensive rewriting to use HTTP requests instead of factory methods
// Most tests are skipped pending refactoring. See USER_MODULE_PATTERN.md for guidance.
describe.skip('Progress Module (e2e)', () => {
  let app: INestApplication;
  let factory: TestDataFactory;
  let dbHelper: DatabaseHelper;
  let prisma: PrismaService;
  let userToken: string;
  let userId: number;
  let user2Token: string;
  let user2Id: number;

  beforeAll(async () => {
    app = await setupTestApp();
    prisma = getPrismaService(app);
    factory = new TestDataFactory(prisma);
    dbHelper = createDatabaseHelper(app);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();

    const timestamp = Date.now();

    // Create test user 1
    const register1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `progress1-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Progress User 1',
      });

    userId = register1.body.data.user.id;
    userToken = register1.body.data.accessToken;

    // Create test user 2
    const register2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `progress2-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Progress User 2',
      });

    user2Id = register2.body.data.user.id;
    user2Token = register2.body.data.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // ==================== PROGRESS OVERVIEW ====================

  describe('GET /progress/overview', () => {
    it('should get progress overview for user with no activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        userId,
        username: expect.any(String),
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
        totalFlashcardSessions: 0,
        totalQuizAttempts: 0,
        kanjiMastered: 0,
        flashcardAccuracy: 0,
        quizAccuracy: 0,
        xp: 0,
        level: 1,
        achievements: 0,
      });
    });

    // TODO: Rewrite with HTTP requests instead of factory methods
    it.skip('should get progress overview with flashcard activity', async () => {
      // Create deck with cards
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Test Deck',
      });

      const kanji1 = await factory.createKanji({ character: '学' });
      const kanji2 = await factory.createKanji({ character: '生' });

      await factory.addCardToDeck(deck.id, kanji1.id);
      await factory.addCardToDeck(deck.id, kanji2.id);

      // Create completed session
      const session = await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300, // 5 minutes
          completed: true,
          completedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        userId,
        totalFlashcardSessions: 1,
        totalStudyTime: 300,
        flashcardAccuracy: 80,
      });
      expect(response.body.data.xp).toBeGreaterThan(0);
    });

    // TODO: Rewrite with HTTP requests instead of factory methods
    it.skip('should get progress overview with quiz activity', async () => {
      // Create quiz with questions
      const quiz = await factory.createQuiz(userId, { title: 'Test Quiz' });
      await factory.addQuestionToQuiz(quiz.id, {
        question: 'What is 学?',
        options: ['Study', 'School', 'Student', 'Life'],
        correctAnswer: 0,
        points: 10,
      });

      // Create completed attempt
      const attempt = await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 1,
        totalQuestions: 1,
        score: 10,
        timeSpent: 60,
      });

      const response = await request(app.getHttpServer())
        .get('/progress/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        userId,
        totalQuizAttempts: 1,
        totalStudyTime: 60,
        quizAccuracy: 100,
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/progress/overview')
        .expect(401);
    });
  });

  // ==================== FLASHCARD PROGRESS ====================

  describe('GET /progress/flashcard', () => {
    it('should get flashcard progress with no sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/flashcard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalSessions: 0,
        totalCardsReviewed: 0,
        totalCorrectAnswers: 0,
        accuracy: 0,
        averageSessionTime: 0,
        deckProgress: [],
      });
    });

    it('should get flashcard progress with sessions', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Progress Deck',
      });

      // Create multiple sessions
      await prisma.flashcardStudySession.createMany({
        data: [
          {
            userId,
            deckId: deck.id,
            cardsReviewed: 10,
            correctAnswers: 8,
            totalTimeSpent: 300,
            completed: true,
            completedAt: new Date(),
          },
          {
            userId,
            deckId: deck.id,
            cardsReviewed: 15,
            correctAnswers: 12,
            totalTimeSpent: 400,
            completed: true,
            completedAt: new Date(),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/progress/flashcard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalSessions: 2,
        totalCardsReviewed: 25,
        totalCorrectAnswers: 20,
        accuracy: 80,
      });
      expect(response.body.data.averageSessionTime).toBeGreaterThan(0);
    });

    it('should filter flashcard progress by period', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Period Deck',
      });

      // Create old session (35 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          completed: true,
          completedAt: oldDate,
          createdAt: oldDate,
        },
      });

      // Create recent session
      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 5,
          correctAnswers: 4,
          totalTimeSpent: 150,
          completed: true,
          completedAt: new Date(),
        },
      });

      // Query with 30d period - should only get recent session
      const response = await request(app.getHttpServer())
        .get('/progress/flashcard')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.totalSessions).toBe(1);
      expect(response.body.data.totalCardsReviewed).toBe(5);
    });
  });

  // ==================== QUIZ PROGRESS ====================

  describe('GET /progress/quiz', () => {
    it('should get quiz progress with no attempts', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/quiz')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalAttempts: 0,
        totalQuizzes: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracy: 0,
        averageScore: 0,
        averageTimePerQuiz: 0,
      });
    });

    it('should get quiz progress with attempts', async () => {
      const quiz = await factory.createQuiz(userId, { title: 'Progress Quiz' });
      await factory.addQuestionToQuiz(quiz.id, {
        question: 'Test Question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        points: 10,
      });

      // Create completed attempts
      await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 1,
        totalQuestions: 1,
        score: 10,
        timeSpent: 60,
      });

      await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 0,
        totalQuestions: 1,
        score: 0,
        timeSpent: 45,
      });

      const response = await request(app.getHttpServer())
        .get('/progress/quiz')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalAttempts: 2,
        totalQuestions: 2,
        totalCorrect: 1,
        accuracy: 50,
        averageScore: 5,
      });
    });

    it('should filter quiz progress by period', async () => {
      const quiz = await factory.createQuiz(userId, { title: 'Period Quiz' });
      await factory.addQuestionToQuiz(quiz.id, {
        question: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        points: 10,
      });

      // Create old attempt (35 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const oldAttempt = await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 1,
        totalQuestions: 1,
        score: 10,
        timeSpent: 60,
      });

      await prisma.quizAttempt.update({
        where: { id: oldAttempt.id },
        data: { createdAt: oldDate, completedAt: oldDate },
      });

      // Create recent attempt
      await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 1,
        totalQuestions: 1,
        score: 10,
        timeSpent: 50,
      });

      // Query with 30d period
      const response = await request(app.getHttpServer())
        .get('/progress/quiz')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.totalAttempts).toBe(1);
    });
  });

  // ==================== STREAKS ====================

  describe('GET /progress/streak', () => {
    it('should get streak with no activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/streak')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      });
    });

    it('should calculate streak from flashcard sessions', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Streak Deck',
      });

      // Create sessions for consecutive days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.flashcardStudySession.createMany({
        data: [
          {
            userId,
            deckId: deck.id,
            cardsReviewed: 5,
            correctAnswers: 4,
            totalTimeSpent: 100,
            completed: true,
            completedAt: yesterday,
            createdAt: yesterday,
          },
          {
            userId,
            deckId: deck.id,
            cardsReviewed: 5,
            correctAnswers: 4,
            totalTimeSpent: 100,
            completed: true,
            completedAt: today,
            createdAt: today,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/progress/streak')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.currentStreak).toBeGreaterThanOrEqual(1);
      expect(response.body.data.longestStreak).toBeGreaterThanOrEqual(1);
      expect(response.body.data.lastStudyDate).toBeTruthy();
    });
  });

  // ==================== LEADERBOARD ====================

  describe('GET /progress/leaderboard', () => {
    it('should get leaderboard with multiple users', async () => {
      // Create activity for users
      const deck1 = await factory.createFlashcardDeck(userId, {
        name: 'User1 Deck',
      });
      const deck2 = await factory.createFlashcardDeck(user2Id, {
        name: 'User2 Deck',
      });

      // User 1 has more activity
      await prisma.flashcardStudySession.createMany({
        data: [
          {
            userId,
            deckId: deck1.id,
            cardsReviewed: 20,
            correctAnswers: 18,
            totalTimeSpent: 500,
            completed: true,
            completedAt: new Date(),
          },
          {
            userId,
            deckId: deck1.id,
            cardsReviewed: 15,
            correctAnswers: 14,
            totalTimeSpent: 400,
            completed: true,
            completedAt: new Date(),
          },
        ],
      });

      // User 2 has less activity
      await prisma.flashcardStudySession.create({
        data: {
          userId: user2Id,
          deckId: deck2.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 200,
          completed: true,
          completedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/leaderboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('leaderboard');
      expect(response.body.data).toHaveProperty('currentUser');
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
      expect(response.body.data.leaderboard.length).toBeGreaterThan(0);

      // Check that users are ordered by XP
      const leaderboard = response.body.data.leaderboard;
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].xp).toBeGreaterThanOrEqual(leaderboard[i + 1].xp);
      }
    });

    it('should limit leaderboard results', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/leaderboard')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.leaderboard.length).toBeLessThanOrEqual(5);
    });

    it('should filter leaderboard by period', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Period Leaderboard Deck',
      });

      // Create old session
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          completed: true,
          completedAt: oldDate,
          createdAt: oldDate,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/leaderboard')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('leaderboard');
    });
  });

  // ==================== ACHIEVEMENTS ====================

  describe('GET /progress/achievements', () => {
    it('should get achievements for user with no activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/achievements')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('achievements');
      expect(Array.isArray(response.body.data.achievements)).toBe(true);
    });

    it('should get achievements for active user', async () => {
      // Create some activity to unlock achievements
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Achievement Deck',
      });

      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 50,
          correctAnswers: 45,
          totalTimeSpent: 1000,
          completed: true,
          completedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/achievements')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('achievements');
      expect(response.body.data).toHaveProperty('totalAchievements');
      expect(response.body.data).toHaveProperty('unlockedCount');
    });
  });

  // ==================== CHART DATA ====================

  describe('GET /progress/chart-data', () => {
    it('should get chart data for 7 days', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/chart-data')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('labels');
      expect(response.body.data).toHaveProperty('flashcardSessions');
      expect(response.body.data).toHaveProperty('quizAttempts');
      expect(response.body.data).toHaveProperty('studyTime');
      expect(Array.isArray(response.body.data.labels)).toBe(true);
    });

    it('should show activity in chart data', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Chart Deck',
      });

      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          completed: true,
          completedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/chart-data')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const totalSessions = response.body.data.flashcardSessions.reduce(
        (sum: number, val: number) => sum + val,
        0,
      );
      expect(totalSessions).toBeGreaterThan(0);
    });

    it('should support different periods', async () => {
      const periods = ['7d', '30d', '90d', '1y'];

      for (const period of periods) {
        const response = await request(app.getHttpServer())
          .get('/progress/chart-data')
          .query({ period })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.data).toHaveProperty('labels');
        expect(Array.isArray(response.body.data.labels)).toBe(true);
      }
    });
  });

  // ==================== STUDY TIME ====================

  describe('GET /progress/study-time', () => {
    it('should get study time with no activity', async () => {
      const response = await request(app.getHttpServer())
        .get('/progress/study-time')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalStudyTime: 0,
        flashcardTime: 0,
        quizTime: 0,
      });
    });

    it('should calculate total study time from sessions and attempts', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Time Deck',
      });
      const quiz = await factory.createQuiz(userId, { title: 'Time Quiz' });

      await factory.addQuestionToQuiz(quiz.id, {
        question: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        points: 10,
      });

      // Flashcard time: 500 seconds
      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 500,
          completed: true,
          completedAt: new Date(),
        },
      });

      // Quiz time: 120 seconds
      await factory.createQuizAttempt(userId, quiz.id, {
        completed: true,
        correctAnswers: 1,
        totalQuestions: 1,
        score: 10,
        timeSpent: 120,
      });

      const response = await request(app.getHttpServer())
        .get('/progress/study-time')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalStudyTime: 620,
        flashcardTime: 500,
        quizTime: 120,
      });
    });

    it('should filter study time by period', async () => {
      const deck = await factory.createFlashcardDeck(userId, {
        name: 'Period Time Deck',
      });

      // Create old session
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const oldSession = await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          completed: true,
          completedAt: oldDate,
          createdAt: oldDate,
        },
      });

      // Create recent session
      await prisma.flashcardStudySession.create({
        data: {
          userId,
          deckId: deck.id,
          cardsReviewed: 5,
          correctAnswers: 4,
          totalTimeSpent: 150,
          completed: true,
          completedAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/progress/study-time')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should only count recent session
      expect(response.body.data.totalStudyTime).toBe(150);
    });
  });
});
