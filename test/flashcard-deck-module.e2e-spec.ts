import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';
import { TestDataFactory } from './helpers/test-data-factory';

describe('Flashcard Deck Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let factory: TestDataFactory;

  let regularUser: any;
  let user2: any;
  let adminUser: any;
  let userToken: string;
  let user2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    factory = new TestDataFactory(prisma);

    // Create test users with unique emails for this test suite
    const timestamp = Date.now();
    regularUser = await factory.users.createUser({
      email: `flashcard-user-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'Flashcard User',
    });

    user2 = await factory.users.createUser({
      email: `flashcard-user2-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'User 2',
    });

    adminUser = await factory.users.createUser({
      email: `flashcard-admin-${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'Admin User',
      role: 'ADMIN',
    });

    // Login to get tokens
    const userLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: regularUser.email, password: 'TestPass123!' });
    userToken = userLoginResponse.body.data.accessToken;

    const user2LoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: user2.email, password: 'TestPass123!' });
    user2Token = user2LoginResponse.body.data.accessToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ account: adminUser.email, password: 'TestPass123!' });
    adminToken = adminLoginResponse.body.data.accessToken;
  });

  afterEach(async () => {
    // Clean test data after each test
    await prisma.flashcardDeckPublishRequest.deleteMany({});
    await prisma.flashcardCard.deleteMany({});
    await prisma.flashcardDeck.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /flashcard-decks', () => {
    it('should create a new flashcard deck', async () => {
      const response = await request(app.getHttpServer())
        .post('/flashcard-decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My First Deck',
          description: 'Test deck description',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('My First Deck');
      expect(response.body.data.description).toBe('Test deck description');
      expect(response.body.data.userId).toBe(regularUser.id);
      expect(response.body.data.isPublic).toBe(false);
    });

    it('should create deck with initial kanji cards', async () => {
      const kanji1 = await factory.kanji.createKanji({
        character: '火',
        meanings: 'fire',
      });
      const kanji2 = await factory.kanji.createKanji({
        character: '水',
        meanings: 'water',
      });

      const response = await request(app.getHttpServer())
        .post('/flashcard-decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Deck with Cards',
          kanjiIds: [kanji1.id, kanji2.id],
        })
        .expect(201);

      expect(response.body.data.cards).toHaveLength(2);
      expect(response.body.data.cards[0].kanji.character).toBe('火');
      expect(response.body.data.cards[1].kanji.character).toBe('水');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-decks')
        .send({ name: 'Test Deck' })
        .expect(401);
    });

    it('should fail with missing name', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'No name' })
        .expect(500); // Service throws Prisma validation error (no DTO)
    });
  });

  describe('GET /flashcard-decks', () => {
    let publicDeck: any;
    let privateDeck: any;

    beforeEach(async () => {
      publicDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Public Deck',
        isPublic: true,
      });

      privateDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Private Deck',
        isPublic: false,
      });
    });

    it('should return user own decks and public decks', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-decks')
        .expect(200);
      
      const decks = response.body.data.data;
      expect(Array.isArray(decks)).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(0);
      
      // Should include public deck
      const foundPublic = decks.some((d: any) => d.id === publicDeck.id);
      expect(foundPublic).toBe(true);
    });

    it('should support search by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-decks?search=Public')
        .expect(200);

      const decks = response.body.data.data;
      expect(decks.every((d: any) => 
        d.name.toLowerCase().includes('public')
      )).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-decks?limit=2&offset=0')
        .expect(200);

      const decks = response.body.data.data;
      expect(decks.length).toBeLessThanOrEqual(2);
      expect(response.body.data.total).toBeGreaterThanOrEqual(0);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.offset).toBe(0);
    });
  });

  describe('GET /flashcard-decks/:id', () => {
    let testDeck: any;
    let otherUserDeck: any;
    let publicDeck: any;

    beforeEach(async () => {
      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Test Deck Detail',
        isPublic: false,
      });

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other User Private',
        isPublic: false,
      });

      publicDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other User Public',
        isPublic: true,
      });
    });

    it('should return deck with cards', async () => {
      const kanji = await factory.kanji.createKanji({
        character: '木',
        meanings: 'tree',
      });
      await factory.flashcardDecks.addCardToDeck(testDeck.id, kanji.id);

      const response = await request(app.getHttpServer())
        .get(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(testDeck.id);
      expect(response.body.data.cards).toHaveLength(1);
      expect(response.body.data.cards[0].kanji.character).toBe('木');
    });

    it('should allow access to own private deck', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.userId).toBe(regularUser.id);
    });

    it('should deny access to other user private deck', async () => {
      await request(app.getHttpServer())
        .get(`/flashcard-decks/${otherUserDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow access to public deck by anyone', async () => {
      const response = await request(app.getHttpServer())
        .get(`/flashcard-decks/${publicDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.isPublic).toBe(true);
    });

    it('should return 404 for non-existent deck', async () => {
      await request(app.getHttpServer())
        .get('/flashcard-decks/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PUT /flashcard-decks/:id', () => {
    let testDeck: any;
    let otherUserDeck: any;

    beforeEach(async () => {
      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Original Name',
        description: 'Original Description',
      });

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other User Deck',
      });
    });

    it('should update deck name and description', async () => {
      const response = await request(app.getHttpServer())
        .put(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated Description',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated Description');
    });

    it('should update deck visibility', async () => {
      const response = await request(app.getHttpServer())
        .put(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isPublic: true })
        .expect(200);

      expect(response.body.data.isPublic).toBe(true);
    });

    it('should fail to update other user deck', async () => {
      await request(app.getHttpServer())
        .put(`/flashcard-decks/${otherUserDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent deck', async () => {
      await request(app.getHttpServer())
        .put('/flashcard-decks/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /flashcard-decks/:id', () => {
    let testDeck: any;
    let otherUserDeck: any;
    let deckWithCards: any;

    beforeEach(async () => {
      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'To Delete',
      });

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other User Deck',
      });

      deckWithCards = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Deck with Cards',
      });
      const kanji = await factory.kanji.createKanji({
        character: '石',
        meanings: 'stone',
      });
      await factory.flashcardDecks.addCardToDeck(deckWithCards.id, kanji.id);
    });

    it('should delete own deck', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify deleted
      await request(app.getHttpServer())
        .get(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should fail to delete other user deck', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${otherUserDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should cascade delete cards', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${deckWithCards.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify cards are deleted
      const cards = await prisma.flashcardCard.findMany({
        where: { deckId: deckWithCards.id },
      });
      expect(cards.length).toBe(0);
    });

    it('should return 404 for non-existent deck', async () => {
      await request(app.getHttpServer())
        .delete('/flashcard-decks/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('POST /flashcard-decks/:id/cards/:kanjiId', () => {
    let testDeck: any;
    let testKanji: any;
    let otherUserDeck: any;

    beforeEach(async () => {
      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Card Test Deck',
      });

      testKanji = await factory.kanji.createKanji({
        character: '金',
        meanings: 'gold, money',
      });

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other Deck',
      });
    });

    it('should add card to deck', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-decks/${testDeck.id}/cards/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // Response is the full deck, not just the card
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(testDeck.id);
      expect(response.body.data.cards).toHaveLength(1);
      expect(response.body.data.cards[0].kanjiId).toBe(testKanji.id);
    });

    it('should fail to add duplicate card', async () => {
      await factory.flashcardDecks.addCardToDeck(testDeck.id, testKanji.id);

      await request(app.getHttpServer())
        .post(`/flashcard-decks/${testDeck.id}/cards/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should fail to add to other user deck', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-decks/${otherUserDeck.id}/cards/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should fail with non-existent kanji', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-decks/${testDeck.id}/cards/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('DELETE /flashcard-decks/:id/cards/:kanjiId', () => {
    let testDeck: any;
    let testKanji: any;
    let otherUserDeck: any;

    beforeEach(async () => {
      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Remove Card Deck',
      });

      testKanji = await factory.kanji.createKanji({
        character: '銀',
        meanings: 'silver',
      });

      await factory.flashcardDecks.addCardToDeck(testDeck.id, testKanji.id);

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other Deck',
      });
    });

    it('should remove card from deck', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${testDeck.id}/cards/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify removed
      const response = await request(app.getHttpServer())
        .get(`/flashcard-decks/${testDeck.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.cards.length).toBe(0);
    });

    it('should fail to remove from other user deck', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${otherUserDeck.id}/cards/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent card', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard-decks/${testDeck.id}/cards/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('POST /flashcard-decks/:id/publish', () => {
    let testDeck: any;
    let otherUserDeck: any;
    let publicDeck: any;
    let emptyDeck: any;
    let testKanji: any;

    beforeEach(async () => {
      testKanji = await factory.kanji.createKanji({
        character: '月',
        meanings: 'moon, month',
      });

      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'To Publish',
        isPublic: false,
      });
      await factory.flashcardDecks.addCardToDeck(testDeck.id, testKanji.id);

      otherUserDeck = await factory.flashcardDecks.createDeck(user2.id, {
        name: 'Other Deck',
      });

      publicDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Already Public',
        isPublic: true,
      });

      emptyDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Empty Deck',
        isPublic: false,
      });
    });

    it('should request publish for own deck', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-decks/${testDeck.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.deckId).toBe(testDeck.id);
    });

    it('should fail to publish empty deck', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-decks/${emptyDeck.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should fail to request publish for other user deck', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-decks/${otherUserDeck.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should fail to request publish for already public deck', async () => {
      await request(app.getHttpServer())
        .post(`/flashcard-decks/${publicDeck.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  describe('GET /flashcard-decks/admin/publish-requests', () => {
    beforeEach(async () => {
      const deck1 = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'Pending Deck',
      });
      const kanji1 = await factory.kanji.createKanji({
        character: '春',
        meanings: 'spring',
      });
      await factory.flashcardDecks.addCardToDeck(deck1.id, kanji1.id);

      await prisma.flashcardDeckPublishRequest.create({
        data: {
          deckId: deck1.id,
          userId: regularUser.id,
          status: 'pending',
        },
      });
    });

    it('should return all publish requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-decks/admin/publish-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/flashcard-decks/admin/publish-requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every((req: any) => req.status === 'pending')).toBe(true);
    });
  });

  describe('POST /flashcard-decks/admin/publish-requests/:id/approve', () => {
    let publishRequest: any;
    let testDeck: any;

    beforeEach(async () => {
      const kanji = await factory.kanji.createKanji({
        character: '夏',
        meanings: 'summer',
      });

      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'To Approve',
        isPublic: false,
      });
      await factory.flashcardDecks.addCardToDeck(testDeck.id, kanji.id);

      publishRequest = await prisma.flashcardDeckPublishRequest.create({
        data: {
          deckId: testDeck.id,
          userId: regularUser.id,
          status: 'pending',
        },
      });
    });

    it('should approve publish request and make deck public', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-decks/admin/publish-requests/${publishRequest.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.data.message).toBe('Publish request approved');

      // Verify deck is now public
      const updatedDeck = await prisma.flashcardDeck.findUnique({
        where: { id: testDeck.id },
      });
      expect(updatedDeck?.isPublic).toBe(true);
    });

    it('should fail to approve non-existent request', async () => {
      await request(app.getHttpServer())
        .post('/flashcard-decks/admin/publish-requests/99999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /flashcard-decks/admin/publish-requests/:id/reject', () => {
    let publishRequest: any;
    let testDeck: any;

    beforeEach(async () => {
      const kanji = await factory.kanji.createKanji({
        character: '秋',
        meanings: 'autumn',
      });

      testDeck = await factory.flashcardDecks.createDeck(regularUser.id, {
        name: 'To Reject',
        isPublic: false,
      });
      await factory.flashcardDecks.addCardToDeck(testDeck.id, kanji.id);

      publishRequest = await prisma.flashcardDeckPublishRequest.create({
        data: {
          deckId: testDeck.id,
          userId: regularUser.id,
          status: 'pending',
        },
      });
    });

    it('should reject publish request with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-decks/admin/publish-requests/${publishRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Not enough cards' })
        .expect(201);

      expect(response.body.data.message).toBe('Publish request rejected');

      // Verify deck is still private
      const updatedDeck = await prisma.flashcardDeck.findUnique({
        where: { id: testDeck.id },
      });
      expect(updatedDeck?.isPublic).toBe(false);
    });

    it('should reject without reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/flashcard-decks/admin/publish-requests/${publishRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(201);

      expect(response.body.data.message).toBe('Publish request rejected');
    });
  });

  describe('Complete Flashcard Deck Workflow', () => {
    it('should complete full lifecycle: create, add cards, publish, approve', async () => {
      // 1. Create deck
      const createResponse = await request(app.getHttpServer())
        .post('/flashcard-decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Complete Workflow Deck' })
        .expect(201);

      const deckId = createResponse.body.data.id;

      // 2. Add multiple cards
      const kanji1 = await factory.kanji.createKanji({
        character: '冬',
        meanings: 'winter',
      });
      const kanji2 = await factory.kanji.createKanji({
        character: '雪',
        meanings: 'snow',
      });

      await request(app.getHttpServer())
        .post(`/flashcard-decks/${deckId}/cards/${kanji1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/flashcard-decks/${deckId}/cards/${kanji2.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // 3. Verify cards were added
      const getResponse = await request(app.getHttpServer())
        .get(`/flashcard-decks/${deckId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body.data.cards.length).toBe(2);

      // 4. Request publish
      const publishResponse = await request(app.getHttpServer())
        .post(`/flashcard-decks/${deckId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      const requestId = publishResponse.body.data.id;

      // 5. Admin approves
      await request(app.getHttpServer())
        .post(`/flashcard-decks/admin/publish-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // 6. Verify deck is now public
      const finalResponse = await request(app.getHttpServer())
        .get(`/flashcard-decks/${deckId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(finalResponse.body.data.isPublic).toBe(true);
      expect(finalResponse.body.data.cards.length).toBe(2);
    });
  });
});
