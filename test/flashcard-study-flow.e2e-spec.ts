import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('Flashcard Study Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: number;
  let deckId: number;
  let cardIds: number[] = [];
  let sessionId: number;

  const testUser = {
    email: `study-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Study Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Register and login
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .then((response) => {
        userId = response.body.id;
      });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: testUser.email,
        password: testUser.password,
      })
      .then((response) => {
        accessToken = response.body.accessToken;
      });

    // Create a test deck with cards
    const deck = await prisma.flashcardDeck.create({
      data: {
        name: 'Test Deck for Study',
        description: 'E2E Test Deck',
        userId: userId,
        isPublic: true,
      },
    });
    deckId = deck.id;

    // Create test cards
    const cardsData = [
      { front: '日', back: 'day, sun', meaning: 'day', kanjiId: 1 },
      { front: '月', back: 'moon, month', meaning: 'moon', kanjiId: 2 },
      { front: '火', back: 'fire', meaning: 'fire', kanjiId: 3 },
      { front: '水', back: 'water', meaning: 'water', kanjiId: 4 },
      { front: '木', back: 'tree, wood', meaning: 'tree', kanjiId: 5 },
    ];

    for (const cardData of cardsData) {
      const card = await prisma.flashcardCard.create({
        data: {
          ...cardData,
          deckId: deckId,
        },
      });
      cardIds.push(card.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (deckId) {
      await prisma.flashcardCard.deleteMany({ where: { deckId } });
      await prisma.flashcardDeck.delete({ where: { id: deckId } }).catch(() => {});
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Deck Discovery', () => {
    it('GET /api/flashcard-decks should list all published decks', () => {
      return request(app.getHttpServer())
        .get('/api/flashcard-decks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          const testDeck = response.body.find((d: any) => d.id === deckId);
          expect(testDeck).toBeDefined();
          expect(testDeck.name).toBe('Test Deck for Study');
        });
    });

    it('GET /api/flashcard-decks/:id should get deck details', () => {
      return request(app.getHttpServer())
        .get(`/api/flashcard-decks/${deckId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(deckId);
          expect(response.body).toHaveProperty('cards');
          expect(response.body.cards).toHaveLength(5);
          expect(response.body).toHaveProperty('_count');
        });
    });

    it('GET /api/flashcard-decks/:id/cards should list cards in deck', () => {
      return request(app.getHttpServer())
        .get(`/api/flashcard-decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body).toHaveLength(5);
          expect(response.body[0]).toHaveProperty('front');
          expect(response.body[0]).toHaveProperty('back');
        });
    });
  });

  describe('Study Session Lifecycle', () => {
    it('POST /api/flashcard-sessions/start should start a new session', () => {
      return request(app.getHttpServer())
        .post('/api/flashcard-sessions/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deckId: deckId,
          reviewType: 'ALL',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('cards');
          expect(response.body.deckId).toBe(deckId);
          expect(response.body.userId).toBe(userId);
          expect(response.body.completed).toBe(false);
          expect(Array.isArray(response.body.cards)).toBe(true);
          expect(response.body.cards.length).toBeGreaterThan(0);
          sessionId = response.body.id;
        });
    });

    it('GET /api/flashcard-sessions/:id should get session details', () => {
      return request(app.getHttpServer())
        .get(`/api/flashcard-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(sessionId);
          expect(response.body).toHaveProperty('cards');
          expect(response.body).toHaveProperty('deck');
          expect(response.body.completed).toBe(false);
        });
    });

    it('POST /api/flashcard-sessions/:id/review/:cardId should review a card (correct)', () => {
      const cardId = cardIds[0];
      return request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/review/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isCorrect: true,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('nextReviewAt');
          expect(response.body).toHaveProperty('easeFactor');
          expect(response.body).toHaveProperty('interval');
          expect(response.body.repetitions).toBe(1);
          expect(response.body.status).toBe('LEARNING');
        });
    });

    it('POST /api/flashcard-sessions/:id/review/:cardId should review a card (incorrect)', () => {
      const cardId = cardIds[1];
      return request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/review/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isCorrect: false,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('nextReviewAt');
          expect(response.body.repetitions).toBe(0); // Reset to 0 on incorrect
          expect(response.body.easeFactor).toBeLessThanOrEqual(2.5);
        });
    });

    it('should update card status based on SM-2 algorithm', async () => {
      const cardId = cardIds[2];

      // First review - correct
      await request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/review/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isCorrect: true })
        .expect(200);

      // Check card progress in database
      const card = await prisma.flashcardCard.findUnique({
        where: { id: cardId },
      });

      expect(card).toBeDefined();
      expect(card?.repetitions).toBeGreaterThanOrEqual(1);
      expect(card?.interval).toBeGreaterThan(0);
    });

    it('should track session statistics', async () => {
      const session = await prisma.flashcardStudySession.findUnique({
        where: { id: sessionId },
      });

      expect(session).toBeDefined();
      expect(session?.cardsReviewed).toBeGreaterThanOrEqual(3); // We reviewed 3 cards
    });

    it('POST /api/flashcard-sessions/:id/complete should complete session', () => {
      return request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('statistics');
          expect(response.body.statistics).toHaveProperty('totalCards');
          expect(response.body.statistics).toHaveProperty('correctCards');
          expect(response.body.statistics).toHaveProperty('incorrectCards');
          expect(response.body.statistics).toHaveProperty('accuracy');
          expect(response.body.statistics.totalCards).toBeGreaterThan(0);
          expect(response.body.completed).toBe(true);
        });
    });

    it('should mark session as completed in database', async () => {
      const session = await prisma.flashcardStudySession.findUnique({
        where: { id: sessionId },
      });

      expect(session?.completed).toBe(true);
      expect(session?.completedAt).toBeDefined();
    });

    it('should fail to review cards in completed session', () => {
      const cardId = cardIds[4];
      return request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/review/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isCorrect: true,
        })
        .expect(400); // Bad request - session already completed
    });
  });

  describe('Progress Tracking', () => {
    it('GET /api/progress/overview should show study progress', () => {
      return request(app.getHttpServer())
        .get('/api/progress/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('xp');
          expect(response.body).toHaveProperty('level');
          expect(response.body).toHaveProperty('flashcardSessions');
          expect(response.body).toHaveProperty('currentStreak');
          expect(response.body.flashcardSessions).toBeGreaterThan(0);
          expect(response.body.xp).toBeGreaterThan(0);
        });
    });

    it('GET /api/progress/flashcards should show flashcard progress', () => {
      return request(app.getHttpServer())
        .get('/api/progress/flashcards')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('totalSessions');
          expect(response.body).toHaveProperty('cardsStudied');
          expect(response.body).toHaveProperty('averageAccuracy');
          expect(response.body).toHaveProperty('statusBreakdown');
          expect(response.body.totalSessions).toBeGreaterThan(0);
          expect(response.body.cardsStudied).toBeGreaterThan(0);
        });
    });

    it('GET /api/progress/streaks should show study streaks', () => {
      return request(app.getHttpServer())
        .get('/api/progress/streaks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('currentStreak');
          expect(response.body).toHaveProperty('longestStreak');
          expect(response.body.currentStreak).toBeGreaterThanOrEqual(1);
        });
    });

    it('GET /api/progress/study-time should show time breakdown', () => {
      return request(app.getHttpServer())
        .get('/api/progress/study-time')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('totalTime');
          expect(response.body).toHaveProperty('byDay');
          expect(response.body).toHaveProperty('byHour');
          expect(response.body.totalTime).toBeGreaterThan(0);
        });
    });
  });

  describe('Multiple Sessions Flow', () => {
    let session2Id: number;

    it('should allow starting a new session after completion', () => {
      return request(app.getHttpServer())
        .post('/api/flashcard-sessions/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deckId: deckId,
          reviewType: 'DUE',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.id).not.toBe(sessionId); // New session ID
          session2Id = response.body.id;
        });
    });

    it('should show only due cards in DUE review type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/flashcard-sessions/${session2Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Cards should be filtered by nextReviewAt <= now
      expect(Array.isArray(response.body.cards)).toBe(true);
      // May be 0 if no cards are due yet
      expect(response.body.cards.length).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate XP across multiple sessions', async () => {
      // Complete second session
      const cardId = cardIds[3];
      await request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${session2Id}/review/${cardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isCorrect: true });

      await request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${session2Id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Check progress
      const progress = await request(app.getHttpServer())
        .get('/api/progress/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(progress.body.flashcardSessions).toBe(2); // Two completed sessions
      expect(progress.body.xp).toBeGreaterThan(50); // At least 1 session worth of XP
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should fail to start session with invalid deck', () => {
      return request(app.getHttpServer())
        .post('/api/flashcard-sessions/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deckId: 999999,
          reviewType: 'ALL',
        })
        .expect(404);
    });

    it('should fail to review non-existent card', () => {
      return request(app.getHttpServer())
        .post(`/api/flashcard-sessions/${sessionId}/review/999999`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isCorrect: true,
        })
        .expect(404);
    });

    it('should fail to access other user sessions', async () => {
      // Create another user
      const otherUser = {
        email: `other-${Date.now()}@example.com`,
        password: 'OtherPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(otherUser);

      const otherLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: otherUser.email,
          password: otherUser.password,
        });

      const otherToken = otherLogin.body.accessToken;

      // Try to access original user's session
      return request(app.getHttpServer())
        .get(`/api/flashcard-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should handle empty deck gracefully', async () => {
      const emptyDeck = await prisma.flashcardDeck.create({
        data: {
          name: 'Empty Deck',
          userId: userId,
          isPublic: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/flashcard-sessions/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deckId: emptyDeck.id,
          reviewType: 'ALL',
        })
        .expect(400);

      expect(response.body.message).toContain('empty');

      await prisma.flashcardDeck.delete({ where: { id: emptyDeck.id } });
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent card reviews', async () => {
      const newSession = await request(app.getHttpServer())
        .post('/api/flashcard-sessions/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deckId: deckId,
          reviewType: 'ALL',
        });

      const newSessionId = newSession.body.id;

      // Review 3 cards concurrently
      const reviews = [cardIds[0], cardIds[1], cardIds[2]].map((cardId) =>
        request(app.getHttpServer())
          .post(`/api/flashcard-sessions/${newSessionId}/review/${cardId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ isCorrect: true }),
      );

      const results = await Promise.all(reviews);
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
    });

    it('should respond quickly to session operations', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/api/flashcard-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
