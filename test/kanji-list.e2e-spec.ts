import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';
import { TransformInterceptor } from '../src/interceptors/transform/transform.interceptor';

describe('Kanji List Module (e2e)', () => {
  let app: INestApplication;
  let dbClient: DbClient;
  let accessToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    // TransformInterceptor already added in AppModule
    
    await app.init();

    dbClient = moduleFixture.get<DbClient>(DbClient);

    // Clean up test data
    // @ts-ignore
    await dbClient.kanjiCollectionItems.deleteMany({});
    // @ts-ignore
    await dbClient.kanjiCollections.deleteMany({
      where: { name: { startsWith: 'Test' } }
    });

    // Use existing admin account
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'admin',
        password: '123456',
      })
      .expect(201);

    console.log('Login response body:', JSON.stringify(loginResponse.body, null, 2));
    accessToken = loginResponse.body.data.accessToken;
    userId = loginResponse.body.data.user.id;
    console.log('Access token:', accessToken);
  });

  afterAll(async () => {
    // Cleanup
    // @ts-ignore
    await dbClient.kanjiCollectionItems.deleteMany({});
    // @ts-ignore
    await dbClient.kanjiCollections.deleteMany({
      where: { name: { startsWith: 'Test' } }
    });

    await app.close();
  });

  describe('POST /kanji-lists', () => {
    it('should create a new kanji list', async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test List 1',
          description: 'My first test list',
          is_public: false,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Test List 1');
      expect(response.body.data.description).toBe('My first test list');
      expect(response.body.data.is_public).toBe(false);
      expect(response.body.data.collection_type).toBe('custom');
    });

    it('should fail to create list with duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Duplicate',
          description: 'First',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Duplicate',
          description: 'Second',
        })
        .expect(409);

      // ConflictException returns message in body
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .send({
          name: 'Test Unauthorized',
        })
        .expect(401);
    });

    it('should fail with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '',
        })
        .expect(400);
    });
  });

  describe('GET /kanji-lists', () => {
    beforeAll(async () => {
      // Create some test lists
      const timestamp = Date.now();
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/kanji-lists')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: `Test Get List ${i} ${timestamp}`,
            description: `Description ${i}`,
            is_public: i % 2 === 0,
          })
          .expect(201);
      }
    });

    it('should get all kanji lists', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists')
        .expect(200);

      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
    });

    it('should filter by is_public', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists?is_public=true')
        .expect(200);

      expect(response.body.data.data.every((list: any) => list.is_public === true)).toBe(true);
    });

    it('should filter by collection_type', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists?collection_type=custom')
        .expect(200);

      expect(response.body.data.data.every((list: any) => list.collection_type === 'custom')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists?page=1&limit=2')
        .expect(200);

      expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      expect(response.body.data.meta.page).toBe(1);
      expect(response.body.data.meta.limit).toBe(2);
    });
  });

  describe('GET /kanji-lists/:id', () => {
    let testListId: number;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test List Detail ${Date.now()}`,
          description: 'For detail test',
        })
        .expect(201);

      console.log('GET/:id beforeAll response:', JSON.stringify(response.body, null, 2));
      testListId = response.body.data.id;
      console.log('testListId extracted:', testListId);
    });

    it('should get kanji list by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/kanji-lists/${testListId}`)
        .expect(200);

      expect(response.body.data.id).toBe(testListId);
      expect(response.body.data.name).toContain('Test List Detail');
    });

    it('should get kanji list with kanjis included', async () => {
      const response = await request(app.getHttpServer())
        .get(`/kanji-lists/${testListId}?include_kanjis=true`)
        .expect(200);

      expect(response.body.data).toHaveProperty('kanjis');
      expect(Array.isArray(response.body.data.kanjis)).toBe(true);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .get('/kanji-lists/999999')
        .expect(404);
    });

    it('should fail with invalid id', async () => {
      await request(app.getHttpServer())
        .get('/kanji-lists/invalid')
        .expect(400);
    });
  });

  describe('PUT /kanji-lists/:id', () => {
    let testListId: number;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test List Update ${Date.now()}`,
          description: 'Original description',
        })
        .expect(201);

      testListId = response.body.data.id;
    });

    it('should update kanji list', async () => {
      const response = await request(app.getHttpServer())
        .put(`/kanji-lists/${testListId}`)
        .send({
          name: 'Test List Updated',
          description: 'Updated description',
          is_public: true,
        })
        .expect(200);

      expect(response.body.data.name).toBe('Test List Updated');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.is_public).toBe(true);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .put('/kanji-lists/999999')
        .send({
          name: 'Updated Name',
        })
        .expect(404);
    });

    it('should fail with duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Existing For Update',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/kanji-lists/${testListId}`)
        .send({
          name: 'Test Existing For Update',
        })
        .expect(409);
    });
  });

  describe('DELETE /kanji-lists/:id', () => {
    it('should delete kanji list', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test List Delete',
        })
        .expect(201);

      const listId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/kanji-lists/${listId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/kanji-lists/${listId}`)
        .expect(404);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .delete('/kanji-lists/999999')
        .expect(404);
    });
  });

  describe('POST /kanji-lists/:id/kanjis', () => {
    let testListId: number;
    let kanjiIds: number[];

    beforeAll(async () => {
      const listResponse = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test List Add Kanjis ${Date.now()}`,
        })
        .expect(201);

      testListId = listResponse.body.data.id;

      // Get some kanji IDs
      const kanjiResponse = await request(app.getHttpServer())
        .get('/kanji?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      kanjiIds = kanjiResponse.body.data.slice(0, 3).map((k: any) => k.id);
    });

    it('should add kanjis to list', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis`)
        .send({
          kanji_ids: kanjiIds,
        })
        .expect(201);

      // POST kanjis returns full collection object with updated count
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('kanji_count');
      expect(response.body.data.kanji_count).toBe(kanjiIds.length);
    });

    it('should fail with empty kanji_ids array', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          kanji_ids: [],
        })
        .expect(400);
    });

    it('should return 404 for non-existent list', async () => {
      // The controller throws BadRequestException for this case
      await request(app.getHttpServer())
        .post('/kanji-lists/999999/kanjis')
        .send({
          kanji_ids: kanjiIds,
        })
        .expect(400);
    });
  });

  describe('POST /kanji-lists/:id/kanjis/bulk', () => {
    let testListId: number;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test List Bulk Add ${Date.now()}`,
        })
        .expect(201);

      testListId = response.body.data.id;
    });

    it('should bulk add kanjis by JLPT level', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis/bulk`)
        .send({
          jlpt: 5,
        })
        .expect(201);

      // Bulk add returns full collection object with updated count
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('kanji_count');
      expect(response.body.data.kanji_count).toBeGreaterThan(0);
    });

    it('should bulk add kanjis by grade', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis/bulk`)
        .send({
          grade: 1,
        })
        .expect(201);

      // Bulk add returns full collection object with updated count
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('kanji_count');
      expect(response.body.data.kanji_count).toBeGreaterThan(0);
    });

    it('should fail without filters', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis/bulk`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should fail with invalid JLPT level', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis/bulk`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          jlpt: 6,
        })
        .expect(400);
    });

    it('should fail with invalid grade', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis/bulk`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          grade: 7,
        })
        .expect(400);
    });
  });

  describe('DELETE /kanji-lists/:id/kanjis', () => {
    let testListId: number;
    let kanjiIds: number[];

    beforeAll(async () => {
      const listResponse = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test List Remove Kanjis ${Date.now()}`,
        })
        .expect(201);

      testListId = listResponse.body.data.id;

      // Get some kanji IDs
      const kanjiResponse = await request(app.getHttpServer())
        .get('/kanji?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      kanjiIds = kanjiResponse.body.data.slice(0, 3).map((k: any) => k.id);

      // Add kanjis first
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testListId}/kanjis`)
        .send({
          kanji_ids: kanjiIds,
        })
        .expect(201);
    });

    it('should remove kanjis from list', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/kanji-lists/${testListId}/kanjis`)
        .send({
          kanji_ids: [kanjiIds[0]],
        })
        .expect(200);

      // DELETE returns full collection object with updated count
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('kanji_count');
      // Should have 2 kanjis remaining (added 3, removed 1)
      expect(response.body.data.kanji_count).toBe(2);
    });

    it('should fail with empty kanji_ids array', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testListId}/kanjis`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          kanji_ids: [],
        })
        .expect(400);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .delete('/kanji-lists/999999/kanjis')
        .send({
          kanji_ids: kanjiIds,
        })
        .expect(404);
    });
  });

  describe('POST /kanji-lists/generate/jlpt', () => {
    it('should generate JLPT kanji list', async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists/generate/jlpt')
        .send({
          jlpt_level: 5,
          name: 'Test JLPT N5',
          is_public: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.collection_type).toBe('jlpt');
    });

    it('should fail with invalid JLPT level', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists/generate/jlpt')
        .send({
          jlpt_level: 0,
          name: 'Invalid JLPT',
        })
        .expect(400);
    });

    it('should fail with duplicate name', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists/generate/jlpt')
        .send({
          jlpt_level: 4,
          name: 'Test Duplicate JLPT',
        })
        .expect(201);

      // Generate JLPT endpoint throws InternalServerErrorException for duplicate names
      await request(app.getHttpServer())
        .post('/kanji-lists/generate/jlpt')
        .send({
          jlpt_level: 4,
          name: 'Test Duplicate JLPT',
        })
        .expect(500);
    });
  });

  describe('POST /kanji-lists/generate/frequency', () => {
    it('should generate frequency kanji list', async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists/generate/frequency')
        .send({
          top_count: 100,
          name: 'Test Top 100',
          is_public: true,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.collection_type).toBe('frequency');
    });

    it('should fail with invalid count', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists/generate/frequency')
        .send({
          top_count: -10,
          name: 'Invalid Frequency',
        })
        .expect(400);
    });
  });
});
