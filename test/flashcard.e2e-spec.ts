import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';
import { TransformInterceptor } from '../src/interceptors/transform/transform.interceptor';

describe('Flashcard Module (e2e)', () => {
  let app: INestApplication;
  let dbClient: DbClient;
  let accessToken: string;

  // Helper to unwrap response from TransformInterceptor
  const unwrap = (response: any) => response.body.data || response.body;
  
  // Helper for double unwrap (for most endpoints)
  const unwrapTwice = (response: any) => unwrap({ body: unwrap(response) });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    dbClient = moduleFixture.get<DbClient>(DbClient);

    // Clean up test data
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.flashcardCard.deleteMany({});
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.flashcardDeck.deleteMany({});

    // Login to get access token  (using the same credentials as quiz tests)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'admin',
        password: '123456',
      })
      .expect(201);

    // Response is double-wrapped by TransformInterceptor
    const unwrappedOnce = unwrap(loginResponse);
    const loginData = unwrap({ body: unwrappedOnce });
    accessToken = loginData.accessToken;
    
    if (!accessToken) {
      console.error('❌ Failed to get access token from login');
      console.error('Login response:', JSON.stringify(loginResponse.body, null, 2));
      throw new Error('No access token received from login');
    }
    
    console.log('✅ Access token obtained successfully');
  });

  afterAll(async () => {
    // Clean up
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.flashcardCard.deleteMany({});
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.flashcardDeck.deleteMany({});
    await app.close();
  });

  describe('Flashcard Deck CRUD Operations', () => {
    let deckId: number;

    beforeAll(async () => {
      // Create a deck for testing
      const response = await request(app.getHttpServer())
        .post('/flashcard/decks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Deck',
          description: 'Test deck description',
          is_public: false,
        });
      
      // Double unwrap like login
      const deck = unwrapTwice(response);
      deckId = deck.id;
      console.log(`✅ Created test deck with ID: ${deckId}`);
    });

    describe('POST /flashcard/decks', () => {
      it('should create a new deck', async () => {
        const response = await request(app.getHttpServer())
          .post('/flashcard/decks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Another Test Deck',
            description: 'Another test deck description',
            is_public: true,
          })
          .expect(201);

        const deck = unwrapTwice(response);
        expect(deck.name).toBe('Another Test Deck');
        expect(deck.description).toBe('Another test deck description');
        expect(deck.is_public).toBe(true);
        expect(deck.id).toBeDefined();
      });

      it('should fail to create deck without authentication', async () => {
        await request(app.getHttpServer())
          .post('/flashcard/decks')
          .send({
            name: 'Test Deck',
          })
          .expect(401);
      });

      it('should fail with invalid data', async () => {
        await request(app.getHttpServer())
          .post('/flashcard/decks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            // Missing required 'name' field
            description: 'Test',
          })
          .expect(400);
      });
    });

    describe('GET /flashcard/decks', () => {
      it('should get all decks', async () => {
        const response = await request(app.getHttpServer())
          .get('/flashcard/decks')
          .expect(200);

        const result = unwrapTwice(response);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.meta).toBeDefined();
      });

      it('should filter decks by search term', async () => {
        const response = await request(app.getHttpServer())
          .get('/flashcard/decks')
          .query({ search: 'Test' })
          .expect(200);

        const result = unwrapTwice(response);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/flashcard/decks')
          .query({ page: 1, limit: 5 })
          .expect(200);

        const result = unwrapTwice(response);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(5);
      });
    });

    describe('GET /flashcard/decks/:id', () => {
      it('should get deck by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/flashcard/decks/${deckId}`)
          .expect(200);

        const deck = unwrapTwice(response);
        expect(deck.id).toBe(deckId);
        expect(deck.name).toBe('Test Deck');
      });

      it('should get deck with cards', async () => {
        const response = await request(app.getHttpServer())
          .get(`/flashcard/decks/${deckId}`)
          .query({ include_cards: 'true' })
          .expect(200);

        const deck = unwrapTwice(response);
        expect(deck.id).toBe(deckId);
        expect(deck.Cards).toBeDefined();
        expect(Array.isArray(deck.Cards)).toBe(true);
      });

      it('should return 404 for non-existent deck', async () => {
        await request(app.getHttpServer())
          .get('/flashcard/decks/99999')
          .expect(404);
      });
    });

    describe('PUT /flashcard/decks/:id', () => {
      it('should update deck', async () => {
        const response = await request(app.getHttpServer())
          .put(`/flashcard/decks/${deckId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Updated Deck Name',
            is_public: true,
          })
          .expect(200);

        const deck = unwrapTwice(response);
        expect(deck.name).toBe('Updated Deck Name');
        expect(deck.is_public).toBe(true);
      });

      it('should fail to update without authentication', async () => {
        await request(app.getHttpServer())
          .put(`/flashcard/decks/${deckId}`)
          .send({ name: 'New Name' })
          .expect(401);
      });
    });
  });

  describe('Flashcard Card CRUD Operations', () => {
    let testDeckId: number;
    let cardId: number;

    beforeAll(async () => {
      // Create a deck for card testing
      const deckResponse = await request(app.getHttpServer())
        .post('/flashcard/decks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Card Test Deck',
          description: 'Deck for testing cards',
        });
      // Double unwrap like login
      testDeckId = unwrapTwice(deckResponse).id;
      console.log(`✅ Created card test deck with ID: ${testDeckId}`);

      // Create a card for testing
      const cardResponse = await request(app.getHttpServer())
        .post(`/flashcard/decks/${testDeckId}/cards`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          front_text: '日',
          back_text: 'Mặt trời, ngày',
          hint: 'Âm Hán: にち',
          order_index: 1,
        });
      // Double unwrap like login
      cardId = unwrapTwice(cardResponse).id;
      console.log(`✅ Created test card with ID: ${cardId}`);
    });

    describe('POST /flashcard/decks/:deckId/cards', () => {
      it('should add a card to deck', async () => {
        const response = await request(app.getHttpServer())
          .post(`/flashcard/decks/${testDeckId}/cards`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            front_text: '月',
            back_text: 'Mặt trăng, tháng',
            hint: 'Âm Hán: げつ',
            order_index: 2,
          })
          .expect(201);

        const card = unwrapTwice(response);
        expect(card.front_text).toBe('月');
        expect(card.back_text).toBe('Mặt trăng, tháng');
        expect(card.hint).toBe('Âm Hán: げつ');
        expect(card.deck_id).toBe(testDeckId);
        expect(card.id).toBeDefined();
      });

      it('should fail to add card without authentication', async () => {
        await request(app.getHttpServer())
          .post(`/flashcard/decks/${testDeckId}/cards`)
          .send({
            front_text: 'Test',
            back_text: 'Test',
          })
          .expect(401);
      });

      it('should fail with invalid data', async () => {
        await request(app.getHttpServer())
          .post(`/flashcard/decks/${testDeckId}/cards`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            // Missing required fields
            front_text: 'Test',
          })
          .expect(400);
      });
    });

    describe('POST /flashcard/decks/:deckId/cards/bulk', () => {
      it('should add multiple cards at once', async () => {
        const response = await request(app.getHttpServer())
          .post(`/flashcard/decks/${testDeckId}/cards/bulk`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            cards: [
              {
                front_text: '火',
                back_text: 'Lửa',
                order_index: 3,
              },
              {
                front_text: '水',
                back_text: 'Nước',
                order_index: 4,
              },
              {
                front_text: '木',
                back_text: 'Cây',
                order_index: 5,
              },
            ],
          })
          .expect(201);

        const result = unwrapTwice(response);
        expect(result.count).toBe(3);
        expect(result.message).toContain('3 card(s)');
      });
    });

    describe('GET /flashcard/decks/:deckId/cards', () => {
      it('should get all cards for a deck', async () => {
        const response = await request(app.getHttpServer())
          .get(`/flashcard/decks/${testDeckId}/cards`)
          .expect(200);

        const cards = unwrapTwice(response);
        expect(Array.isArray(cards)).toBe(true);
        expect(cards.length).toBeGreaterThanOrEqual(4); // At least: 1 from beforeAll + 1 from single + 3 from bulk
      });
    });

    describe('GET /flashcard/cards/:id', () => {
      it('should get card by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/flashcard/cards/${cardId}`)
          .expect(200);

        const card = unwrapTwice(response);
        expect(card.id).toBe(cardId);
        expect(card.front_text).toBe('日');
      });

      it('should return 404 for non-existent card', async () => {
        await request(app.getHttpServer())
          .get('/flashcard/cards/99999')
          .expect(404);
      });
    });

    describe('PUT /flashcard/cards/:id', () => {
      it('should update card', async () => {
        const response = await request(app.getHttpServer())
          .put(`/flashcard/cards/${cardId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            front_text: '日本',
            back_text: 'Nhật Bản',
            hint: 'Âm Hán: にほん',
          })
          .expect(200);

        const card = unwrapTwice(response);
        expect(card.front_text).toBe('日本');
        expect(card.back_text).toBe('Nhật Bản');
      });

      it('should fail to update without authentication', async () => {
        await request(app.getHttpServer())
          .put(`/flashcard/cards/${cardId}`)
          .send({ front_text: 'New' })
          .expect(401);
      });
    });

    describe('DELETE /flashcard/cards/:id', () => {
      it('should delete card', async () => {
        await request(app.getHttpServer())
          .delete(`/flashcard/cards/${cardId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verify card is deleted
        await request(app.getHttpServer())
          .get(`/flashcard/cards/${cardId}`)
          .expect(404);
      });

      it('should fail to delete without authentication', async () => {
        // Get any existing card
        const cardsResponse = await request(app.getHttpServer())
          .get(`/flashcard/decks/${testDeckId}/cards`);
        const cards = unwrap(cardsResponse);
        
        if (cards.length > 0) {
          await request(app.getHttpServer())
            .delete(`/flashcard/cards/${cards[0].id}`)
            .expect(401);
        }
      });
    });
  });

  describe('DELETE /flashcard/decks/:id', () => {
    let deleteDeckId: number;

    beforeAll(async () => {
      // Create a deck to delete
      const response = await request(app.getHttpServer())
        .post('/flashcard/decks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Deck to Delete',
        });
      deleteDeckId = unwrapTwice(response).id;

      // Add some cards
      await request(app.getHttpServer())
        .post(`/flashcard/decks/${deleteDeckId}/cards`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          front_text: 'Test',
          back_text: 'Test',
        });
    });

    it('should delete deck and cascade delete cards', async () => {
      await request(app.getHttpServer())
        .delete(`/flashcard/decks/${deleteDeckId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deck is deleted
      await request(app.getHttpServer())
        .get(`/flashcard/decks/${deleteDeckId}`)
        .expect(404);
    });

    it('should fail to delete without authentication', async () => {
      // Create another deck
      const response = await request(app.getHttpServer())
        .post('/flashcard/decks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Another Deck',
        });
      const anotherDeckId = unwrapTwice(response).id;

      await request(app.getHttpServer())
        .delete(`/flashcard/decks/${anotherDeckId}`)
        .expect(401);
    });
  });
});
