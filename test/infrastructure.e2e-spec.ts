import { INestApplication } from '@nestjs/common';
import { setupTestApp, closeTestApp, getPrismaService } from './helpers/test-setup';
import { TestDataFactory } from './helpers/test-data-factory';
import { createAndLoginUser, createAndLoginAdmin } from './helpers/auth-helper';
import { createDatabaseHelper, DatabaseHelper } from './helpers/database-helper';
import * as request from 'supertest';

describe('Integration Test Infrastructure (e2e)', () => {
  let app: INestApplication;
  let factory: TestDataFactory;
  let dbHelper: DatabaseHelper;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = getPrismaService(app);
    factory = new TestDataFactory(prisma);
    dbHelper = createDatabaseHelper(app);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('Test Infrastructure Verification', () => {
    it('should setup application successfully', () => {
      expect(app).toBeDefined();
    });

    it('should create database helper', () => {
      expect(dbHelper).toBeDefined();
    });

    it('should create test data factory', () => {
      expect(factory).toBeDefined();
      expect(factory.users).toBeDefined();
      expect(factory.kanji).toBeDefined();
      expect(factory.kanjiLists).toBeDefined();
      expect(factory.flashcardDecks).toBeDefined();
      expect(factory.quizzes).toBeDefined();
      expect(factory.categories).toBeDefined();
    });
  });

  describe('User Factory', () => {
    it('should create regular user', async () => {
      const user = await factory.users.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('USER');
    });

    it('should create admin user', async () => {
      const admin = await factory.users.createAdminUser({
        email: 'admin@example.com',
        name: 'Admin User',
      });

      expect(admin).toBeDefined();
      expect(admin.role).toBe('ADMIN');
    });
  });

  describe('Kanji Factory', () => {
    it('should create single kanji', async () => {
      const kanji = await factory.kanji.createKanji({
        character: '日',
        meanings: 'day, sun',
        jlpt: 5,
      });

      expect(kanji).toBeDefined();
      expect(kanji.character).toBe('日');
      expect(kanji.meanings).toBe('day, sun');
    });

    it('should create multiple kanji', async () => {
      const kanjiList = await factory.kanji.createMultipleKanji(5);

      expect(kanjiList).toBeDefined();
      expect(kanjiList.length).toBe(5);
    });
  });

  describe('Authentication Helpers', () => {
    it('should register and login user', async () => {
      const auth = await createAndLoginUser(app, {
        email: 'newuser@example.com',
        password: 'Test123!@#',
        name: 'New User',
      });

      expect(auth).toBeDefined();
      expect(auth.accessToken).toBeDefined();
      expect(auth.user).toBeDefined();
      expect(auth.user.email).toBe('newuser@example.com');
    });

    it('should create and login admin', async () => {
      const adminAuth = await createAndLoginAdmin(app);

      expect(adminAuth).toBeDefined();
      expect(adminAuth.accessToken).toBeDefined();
      expect(adminAuth.user.role).toBe('ADMIN');
    });

    it('should make authenticated request', async () => {
      const auth = await createAndLoginUser(app);

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBe(auth.user.email);
    });
  });

  describe('Database Helpers', () => {
    it('should cleanup database', async () => {
      // Create some data
      await factory.users.createUser();
      await factory.kanji.createKanji();

      // Cleanup
      await dbHelper.cleanup();

      // Verify empty
      const isEmpty = await dbHelper.isDatabaseEmpty();
      expect(isEmpty).toBe(true);
    });

    it('should seed basic data', async () => {
      await dbHelper.seedBasicData();

      const categoryCount = await dbHelper.getTableCount('Category');
      const kanjiCount = await dbHelper.getTableCount('Kanji');

      expect(categoryCount).toBeGreaterThan(0);
      expect(kanjiCount).toBeGreaterThan(0);
    });

    it('should get table count', async () => {
      await factory.users.createUser();
      await factory.users.createUser();

      const count = await dbHelper.getTableCount('User');
      expect(count).toBe(2);
    });
  });

  describe('Complete Workflow Test', () => {
    it('should test complete user workflow', async () => {
      // 1. Create and login user
      const auth = await createAndLoginUser(app);

      // 2. Create kanji
      const kanji = await factory.kanji.createKanji({
        character: '水',
        meanings: 'water',
      });

      // 3. Create kanji list
      const list = await factory.kanjiLists.createKanjiList(auth.user.id, {
        name: 'My Water List',
      });

      // 4. Add kanji to list
      await factory.kanjiLists.addKanjiToList(list.id, kanji.id, 1);

      // 5. Verify list exists
      const response = await request(app.getHttpServer())
        .get(`/kanji-list/${list.id}`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(response.body.name).toBe('My Water List');
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBe(1);
    });
  });
});
