import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';
import { TestDataFactory } from './helpers/test-data-factory';

describe('Flashcard Session Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let factory: TestDataFactory;

  let regularUser: any;
  let user2: any;
  let adminUser: any;
  let regularToken: string;
  let user2Token: string;
  let adminToken: string;

  let testDeck: any;
  let user2Deck: any;
  let testKanji1: any;
  let testKanji2: any;
  let testKanji3: any;
  let testCard1: any;
  let testCard2: any;
  let testCard3: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    factory = new TestDataFactory(prisma);

    // Create unique users for this test suite
    const timestamp = Date.now();
    const password = 'Password123!';

    regularUser = await factory.users.createUser({
      email: `session-user-${timestamp}@test.com`,
      password: password,
      name: 'Session User',
    });

    user2 = await factory.users.createUser({
      email: `session-user2-${timestamp}@test.com`,
      password: password,
      name: 'Session User 2',
    });

    adminUser = await factory.users.createUser({
      email: `session-admin-${timestamp}@test.com`,
      password: password,
      name: 'Session Admin',
      role: 'ADMIN',
    });

    // Login to get tokens
    const loginResponse1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: regularUser.email, password: password });
    regularToken = loginResponse1.body.data.accessToken;

    const loginResponse2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: user2.email, password: password });
    user2Token = loginResponse2.body.data.accessToken;

    const loginResponse3 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: adminUser.email, password: password });
    adminToken = loginResponse3.body.data.accessToken;

    // Create test kanji using factory
    testKanji1 = await factory.kanji.createKanji({
      character: '学',
      meanings: 'study, learning',
      onyomi: 'ガク',
      kunyomi: 'まな.ぶ',
      jlpt: 5,
      grade: 1,
    });

    testKanji2 = await factory.kanji.createKanji({
      character: '生',
      meanings: 'life, birth',
      onyomi: 'セイ',
      kunyomi: 'い.きる',
      jlpt: 5,
      grade: 1,
    });

    testKanji3 = await factory.kanji.createKanji({
      character: '先',
      meanings: 'before, ahead',
      onyomi: 'セン',
      kunyomi: 'さき',
      jlpt: 5,
      grade: 1,
    });

    // Create test deck with cards for regular user
    testDeck = await prisma.flashcardDeck.create({
      data: {
        userId: regularUser.id,
        name: 'Session Test Deck',
        description: 'Deck for session testing',
        isPublic: false,
      },
    });

    testCard1 = await prisma.flashcardCard.create({
      data: {
        deckId: testDeck.id,
        kanjiId: testKanji1.id,
        front: testKanji1.character,
        back: testKanji1.meanings,
      },
    });

    testCard2 = await prisma.flashcardCard.create({
      data: {
        deckId: testDeck.id,
        kanjiId: testKanji2.id,
        front: testKanji2.character,
        back: testKanji2.meanings,
      },
    });

    testCard3 = await prisma.flashcardCard.create({
      data: {
        deckId: testDeck.id,
        kanjiId: testKanji3.id,
        front: testKanji3.character,
        back: testKanji3.meanings,
      },
    });

    // Create deck for user2
    user2Deck = await prisma.flashcardDeck.create({
      data: {
        userId: user2.id,
        name: 'User2 Deck',
        description: 'Another user deck',
        isPublic: false,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up session data BEFORE each test to avoid unique constraint violations
    await prisma.flashcardReview.deleteMany({});
    await prisma.sessionCard.deleteMany({});
    await prisma.flashcardStudySession.deleteMany({});

    // Reset cards to initial state (new/unreviewed)
    await prisma.flashcardCard.updateMany({
      where: {
        deckId: testDeck.id,
      },
      data: {
        lastReviewedAt: null,
        nextReviewAt: new Date(),
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 0,
      },
    });
  });

  afterEach(async () => {
    // Clean up session data after each test
    await prisma.flashcardReview.deleteMany({});
    await prisma.sessionCard.deleteMany({});
    await prisma.flashcardStudySession.deleteMany({});
  });

  describe('POST /flashcard-sessions/start', () => {
    it('should start a new study session', async () => {
      const response = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.deckId).toBe(testDeck.id);
      expect(response.body.data.deckName).toBe('Session Test Deck');
      expect(response.body.data.totalCards).toBe(3);
      expect(response.body.data.newCards).toBe(3);
      expect(response.body.data.reviewCards).toBe(0);
      expect(response.body.data).toHaveProperty('startedAt');
    });

    it('should limit new cards based on maxNewCards', async () => {
      const response = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 2,
          maxReviewCards: 20,
        })
        .expect(201);

      expect(response.body.data.totalCards).toBe(2);
      expect(response.body.data.newCards).toBe(2);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .send({
          deckId: testDeck.id,
        })
        .expect(401);
    });

    it('should fail with non-existent deck', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: 99999,
        })
        .expect(404);
    });

    it('should fail when accessing other user deck', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: user2Deck.id,
        })
        .expect(404);
    });

    it('should fail with invalid maxNewCards', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 100, // Max is 50
        })
        .expect(400);
    });
  });

  describe('GET /flashcard-sessions/:sessionId', () => {
    let testSession: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        });
      testSession = response.body.data;
    });

    it('should get session progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.sessionId).toBe(testSession.sessionId);
      expect(response.body.data.totalCards).toBe(3);
      expect(response.body.data.cardsReviewed).toBe(0);
      expect(response.body.data.correctAnswers).toBe(0);
      expect(response.body.data.incorrectAnswers).toBe(0);
      expect(response.body.data.accuracy).toBe(0);
      expect(response.body.data).toHaveProperty('startedAt');
      expect(response.body.data).toHaveProperty('timeElapsed');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}`)
        .expect(401);
    });

    it('should fail with non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-sessions/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail when accessing other user session', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  describe('GET /flashcard-sessions/:sessionId/next-card', () => {
    let testSession: any;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        });
      testSession = response.body.data;
    });

    it('should get next card in session', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('cardId');
      expect(response.body.data).toHaveProperty('kanjiId');
      expect(response.body.data).toHaveProperty('character');
      expect(response.body.data).toHaveProperty('meaning');
      expect(response.body.data).toHaveProperty('onyomi');
      expect(response.body.data).toHaveProperty('kunyomi');
      expect(response.body.data.isNew).toBe(true);
      expect(response.body.data.currentCard).toBe(1);
      expect(response.body.data.totalCards).toBe(3);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .expect(401);
    });

    it('should fail with non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-sessions/99999/next-card')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should return 404 when no more cards available', async () => {
      // Review all cards first
      const card1Response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`);
      const card1 = card1Response.body.data;

      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${card1.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 5 });

      const card2Response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`);
      const card2 = card2Response.body.data;

      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${card2.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 5 });

      const card3Response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`);
      const card3 = card3Response.body.data;

      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${card3.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 5 });

      // Now should have no more cards
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });
  });

  describe('POST /flashcard-sessions/:sessionId/review/:cardId', () => {
    let testSession: any;
    let nextCard: any;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);
      
      testSession = sessionResponse.body.data;

      if (!testSession || !testSession.sessionId) {
        throw new Error(`Session creation failed. Response: ${JSON.stringify(sessionResponse.body)}`);
      }

      const cardResponse = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      
      nextCard = cardResponse.body.data;

      if (!nextCard || !nextCard.cardId) {
        throw new Error(`Getting next card failed. Response: ${JSON.stringify(cardResponse.body)}`);
      }
    });

    it('should review card with perfect quality (5)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          quality: 5,
          timeSpent: 3.5,
        })
        .expect(200);

      expect(response.body.data.cardId).toBe(nextCard.cardId);
      expect(response.body.data.character).toBe(nextCard.character);
      expect(response.body.data.isCorrect).toBe(true);
      expect(response.body.data.easinessFactor).toBeGreaterThanOrEqual(2.5);
      expect(response.body.data.repetitions).toBe(1);
      expect(response.body.data.interval).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('nextReviewAt');
    });

    it('should review card with good quality (4)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          quality: 4,
        })
        .expect(200);

      expect(response.body.data.isCorrect).toBe(true);
      expect(response.body.data.easinessFactor).toBeGreaterThanOrEqual(2.5);
    });

    it('should review card with correct but hard (3)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          quality: 3,
        })
        .expect(200);

      expect(response.body.data.isCorrect).toBe(true);
      expect(response.body.data.repetitions).toBe(1);
    });

    it('should review card with incorrect quality (2)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          quality: 2,
        })
        .expect(200);

      expect(response.body.data.isCorrect).toBe(false);
      expect(response.body.data.repetitions).toBe(0);
      expect(response.body.data.interval).toBe(1); // SM-2 sets interval to 1 for incorrect answers
    });

    it('should review card with complete blackout (0)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          quality: 0,
        })
        .expect(200);

      expect(response.body.data.isCorrect).toBe(false);
      expect(response.body.data.repetitions).toBe(0);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .send({ quality: 5 })
        .expect(401);
    });

    it('should fail with invalid quality value', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 6 }) // Max is 5
        .expect(400);
    });

    it('should fail with non-existent session', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/99999/review/${nextCard.cardId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 5 })
        .expect(404);
    });

    it('should fail with non-existent card', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/review/99999`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ quality: 5 })
        .expect(404);
    });
  });

  describe('POST /flashcard-sessions/:sessionId/complete', () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionResponse = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);
      
      testSession = sessionResponse.body.data;

      if (!testSession || !testSession.sessionId) {
        throw new Error(`Session creation failed. Response: ${JSON.stringify(sessionResponse.body)}`);
      }
    });

    it('should complete session after reviewing all cards', async () => {
      // Review all 3 cards
      for (let i = 0; i < 3; i++) {
        const cardResponse = await request(app.getHttpServer())
          .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
          .set('Authorization', `Bearer ${regularToken}`);
        const card = cardResponse.body.data;

        await request(app.getHttpServer())
          .post(`/flashcard-sessions/${testSession.sessionId}/review/${card.cardId}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ quality: 5 });
      }

      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.sessionId).toBe(testSession.sessionId);
      expect(response.body.data.totalCards).toBe(3);
      expect(response.body.data.correctAnswers).toBe(3);
      expect(response.body.data.incorrectAnswers).toBe(0);
      expect(response.body.data.accuracy).toBe(100);
      expect(response.body.data).toHaveProperty('totalTime');
      expect(response.body.data).toHaveProperty('cardsMastered');
      expect(response.body.data).toHaveProperty('completedAt');
    });

    it('should complete session with mixed results', async () => {
      // Review with mixed quality
      const qualities = [5, 3, 0]; // Perfect, correct-hard, blackout
      for (let i = 0; i < 3; i++) {
        const cardResponse = await request(app.getHttpServer())
          .get(`/flashcard-sessions/${testSession.sessionId}/next-card`)
          .set('Authorization', `Bearer ${regularToken}`);
        const card = cardResponse.body.data;

        await request(app.getHttpServer())
          .post(`/flashcard-sessions/${testSession.sessionId}/review/${card.cardId}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ quality: qualities[i] });
      }

      const response = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.totalCards).toBe(3);
      expect(response.body.data.correctAnswers).toBe(2);
      expect(response.body.data.incorrectAnswers).toBe(1);
      expect(response.body.data.accuracy).toBe(67); // 2/3 * 100 = 66.67, rounded to 67
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/complete`)
        .expect(401);
    });

    it('should fail with non-existent session', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-sessions/99999/complete')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail when completing already completed session', async () => {
      // Complete session first time
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      // Try to complete again
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${testSession.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });
  });

  describe('GET /flashcard-sessions/due-cards/:deckId', () => {
    it('should get due cards count for new deck', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/due-cards/${testDeck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.deckId).toBe(testDeck.id);
      expect(response.body.data.deckName).toBe('Session Test Deck');
      expect(response.body.data.totalDue).toBeGreaterThanOrEqual(3);
      expect(response.body.data.newCards).toBe(3);
      expect(response.body.data.dueToday).toBeGreaterThanOrEqual(0);
      expect(response.body.data.overdue).toBe(0);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/due-cards/${testDeck.id}`)
        .expect(401);
    });

    it('should fail with non-existent deck', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-sessions/due-cards/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail when accessing other user deck', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/due-cards/${user2Deck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });
  });

  describe('GET /flashcard-sessions/statistics/study', () => {
    beforeEach(async () => {
      // Create a completed session for statistics
      const sessionResponse = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);
      
      const session = sessionResponse.body.data;

      if (!session || !session.sessionId) {
        throw new Error(`Session creation failed. Response: ${JSON.stringify(sessionResponse.body)}`);
      }

      // Review all cards
      for (let i = 0; i < 3; i++) {
        const cardResponse = await request(app.getHttpServer())
          .get(`/flashcard-sessions/${session.sessionId}/next-card`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);
        
        const card = cardResponse.body.data;

        if (!card || !card.cardId) {
          throw new Error(`Getting next card failed. Response: ${JSON.stringify(cardResponse.body)}`);
        }

        await request(app.getHttpServer())
          .post(`/flashcard-sessions/${session.sessionId}/review/${card.cardId}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ quality: 5 })
          .expect(200);
      }

      // Complete session
      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${session.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
    });

    it('should get study statistics for all decks', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/study')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('totalSessions');
      expect(response.body.data).toHaveProperty('totalCardsReviewed');
      expect(response.body.data).toHaveProperty('totalCorrect');
      expect(response.body.data).toHaveProperty('totalIncorrect');
      expect(response.body.data).toHaveProperty('accuracy');
      expect(response.body.data).toHaveProperty('totalStudyTime');
      expect(response.body.data).toHaveProperty('avgSessionTime');
      expect(response.body.data).toHaveProperty('cardsMastered');
      expect(response.body.data).toHaveProperty('currentStreak');
      expect(response.body.data).toHaveProperty('longestStreak');
      expect(response.body.data).toHaveProperty('dailyStats');
      expect(Array.isArray(response.body.data.dailyStats)).toBe(true);
    });

    it('should get study statistics for specific deck', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/study')
        .query({ deckId: testDeck.id })
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.totalSessions).toBeGreaterThanOrEqual(1);
      expect(response.body.data.totalCardsReviewed).toBeGreaterThanOrEqual(3);
    });

    it('should get statistics for custom time period', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/study')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('dailyStats');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/study')
        .expect(401);
    });
  });

  describe('GET /flashcard-sessions/statistics/deck/:deckId', () => {
    beforeEach(async () => {
      // Create a completed session
      const sessionResponse = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);
      
      const session = sessionResponse.body.data;

      if (!session || !session.sessionId) {
        throw new Error(`Session creation failed. Response: ${JSON.stringify(sessionResponse.body)}`);
      }

      // Review all cards
      for (let i = 0; i < 3; i++) {
        const cardResponse = await request(app.getHttpServer())
          .get(`/flashcard-sessions/${session.sessionId}/next-card`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);
        
        const card = cardResponse.body.data;

        if (!card || !card.cardId) {
          throw new Error(`Getting next card failed. Response: ${JSON.stringify(cardResponse.body)}`);
        }

        await request(app.getHttpServer())
          .post(`/flashcard-sessions/${session.sessionId}/review/${card.cardId}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ quality: 5 })
          .expect(200);
      }

      await request(app.getHttpServer())
        .post(`/flashcard-sessions/${session.sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
    });

    it('should get detailed deck statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-sessions/statistics/deck/${testDeck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.deckId).toBe(testDeck.id);
      expect(response.body.data.deckName).toBe('Session Test Deck');
      expect(response.body.data.totalCards).toBe(3);
      expect(response.body.data).toHaveProperty('newCards');
      expect(response.body.data).toHaveProperty('learningCards');
      expect(response.body.data).toHaveProperty('reviewCards');
      expect(response.body.data).toHaveProperty('masteredCards');
      expect(response.body.data).toHaveProperty('dueCards');
      expect(response.body.data).toHaveProperty('avgEasinessFactor');
      expect(response.body.data).toHaveProperty('totalStudyTime');
      expect(response.body.data).toHaveProperty('lastStudiedAt');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/statistics/deck/${testDeck.id}`)
        .expect(401);
    });

    it('should fail with non-existent deck', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/deck/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail when accessing other user deck', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-sessions/statistics/deck/${user2Deck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });
  });

  describe('Complete Flashcard Session Workflow', () => {
    it('should complete full study session workflow', async () => {
      // 1. Check due cards
      const dueCardsResponse = await request(app.getHttpServer())
        .get(`/flashcard-sessions/due-cards/${testDeck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(dueCardsResponse.body.data.newCards).toBe(3);

      // 2. Start session
      const startResponse = await request(app.getHttpServer())
        .post('/flashcard-sessions/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          deckId: testDeck.id,
          maxNewCards: 10,
          maxReviewCards: 20,
        })
        .expect(201);
      const sessionId = startResponse.body.data.sessionId;
      expect(startResponse.body.data.totalCards).toBe(3);

      // 3. Get session progress (initial)
      const progressResponse1 = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(progressResponse1.body.data.cardsReviewed).toBe(0);

      // 4. Study all cards
      const qualities = [5, 4, 3]; // Perfect, good, correct-hard
      for (let i = 0; i < 3; i++) {
        // Get next card
        const cardResponse = await request(app.getHttpServer())
          .get(`/flashcard-sessions/${sessionId}/next-card`)
          .set('Authorization', `Bearer ${regularToken}`)
          .expect(200);
        const card = cardResponse.body.data;
        expect(card.currentCard).toBe(i + 1);
        expect(card.totalCards).toBe(3);

        // Review card
        const reviewResponse = await request(app.getHttpServer())
          .post(`/flashcard-sessions/${sessionId}/review/${card.cardId}`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({
            quality: qualities[i],
            timeSpent: 2.5 + i,
          })
          .expect(200);
        expect(reviewResponse.body.data.isCorrect).toBe(true);
        expect(reviewResponse.body.data).toHaveProperty('nextReviewAt');
      }

      // 5. Check progress after reviewing
      const progressResponse2 = await request(app.getHttpServer())
        .get(`/flashcard-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(progressResponse2.body.data.cardsReviewed).toBe(3);
      expect(progressResponse2.body.data.correctAnswers).toBe(3);
      expect(progressResponse2.body.data.accuracy).toBe(100);

      // 6. Complete session
      const completeResponse = await request(app.getHttpServer())
        .post(`/flashcard-sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(completeResponse.body.data.totalCards).toBe(3);
      expect(completeResponse.body.data.accuracy).toBe(100);
      expect(completeResponse.body.data).toHaveProperty('completedAt');

      // 7. Check study statistics
      const statsResponse = await request(app.getHttpServer())
        .get('/flashcard-sessions/statistics/study')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(statsResponse.body.data.totalSessions).toBeGreaterThanOrEqual(1);
      expect(statsResponse.body.data.totalCardsReviewed).toBeGreaterThanOrEqual(3);

      // 8. Check deck statistics
      const deckStatsResponse = await request(app.getHttpServer())
        .get(`/flashcard-sessions/statistics/deck/${testDeck.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
      expect(deckStatsResponse.body.data.totalCards).toBe(3);
      expect(deckStatsResponse.body.data).toHaveProperty('lastStudiedAt');
    });
  });
});
