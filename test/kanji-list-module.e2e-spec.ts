import { INestApplication } from '@nestjs/common';
import { setupTestApp, closeTestApp, getPrismaService } from './helpers/test-setup';
import { TestDataFactory } from './helpers/test-data-factory';
import { createDatabaseHelper, DatabaseHelper } from './helpers/database-helper';
import { PrismaService } from '../src/shared/services/prisma.service';
import * as request from 'supertest';

describe('Kanji List Module (e2e)', () => {
  let app: INestApplication;
  let factory: TestDataFactory;
  let dbHelper: DatabaseHelper;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let user2Token: string;
  let adminUser: any;
  let regularUser: any;
  let user2: any;

  beforeAll(async () => {
    app = await setupTestApp();
    prisma = getPrismaService(app);
    factory = new TestDataFactory(prisma);
    dbHelper = createDatabaseHelper(app);

    // Clean up database completely before creating test users
    await dbHelper.cleanup();

    // Create test users
    const adminPassword = 'AdminPass123!@#';
    const userPassword = 'UserPass123!@#';
    const user2Password = 'User2Pass123!@#';

    adminUser = await factory.users.createAdminUser({
      email: 'kanjilist-admin@test.com',
      password: adminPassword,
      name: 'Admin User',
    });

    regularUser = await factory.users.createUser({
      email: 'kanjilist-user@test.com',
      password: userPassword,
      name: 'Regular User',
    });

    user2 = await factory.users.createUser({
      email: 'kanjilist-user2@test.com',
      password: user2Password,
      name: 'User 2',
    });

    // Login to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'kanjilist-admin@test.com',
        password: adminPassword,
      });

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'kanjilist-user@test.com',
        password: userPassword,
      });

    const user2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'kanjilist-user2@test.com',
        password: user2Password,
      });

    if (adminLogin.status === 201 && adminLogin.body.data?.accessToken) {
      adminToken = adminLogin.body.data.accessToken;
    } else {
      throw new Error('Failed to login as admin');
    }

    if (userLogin.status === 201 && userLogin.body.data?.accessToken) {
      userToken = userLogin.body.data.accessToken;
    } else {
      throw new Error('Failed to login as user');
    }

    if (user2Login.status === 201 && user2Login.body.data?.accessToken) {
      user2Token = user2Login.body.data.accessToken;
    } else {
      throw new Error('Failed to login as user2');
    }
  });

  beforeEach(async () => {
    // Clean only kanji list related data, keep users for authentication
    await prisma.kanjiListPublishRequest.deleteMany();
    await prisma.kanjiListItem.deleteMany();
    await prisma.kanjiList.deleteMany();
    await prisma.kanji.deleteMany();
    await prisma.category.deleteMany();
    
    // Re-seed basic data
    await dbHelper.seedBasicData();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // ==================== CREATE KANJI LIST ====================

  describe('POST /kanji-lists', () => {
    it('should create a new kanji list', async () => {
      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Study List',
          description: 'Personal kanji study list',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('My Study List');
      expect(response.body.data.description).toBe('Personal kanji study list');
      expect(response.body.data.userId).toBe(regularUser.id);
      expect(response.body.data.isPublic).toBe(false);
    });

    it('should create list with category', async () => {
      const category = await factory.categories.createCategory({
        name: 'JLPT N5',
      });

      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'N5 Practice',
          categoryId: category.id,
        })
        .expect(201);

      expect(response.body.data.categoryId).toBe(category.id);
    });

    it('should create list with initial kanji', async () => {
      const kanji1 = await factory.kanji.createKanji({ character: '日', meanings: 'sun, day' });
      const kanji2 = await factory.kanji.createKanji({ character: '月', meanings: 'moon, month' });

      const response = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Basic Kanji',
          kanjiIds: [kanji1.id, kanji2.id],
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      // Verify kanji were added
      const items = await prisma.kanjiListItem.findMany({
        where: { listId: response.body.data.id },
      });
      expect(items.length).toBe(2);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .send({
          name: 'Test List',
        })
        .expect(401);
    });

    it('should fail with missing name', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'No name',
        })
        .expect(400);
    });
  });

  // ==================== GET KANJI LISTS ====================

  describe('GET /kanji-lists', () => {
    beforeEach(async () => {
      // Create test lists
      await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'User Private List',
        isPublic: false,
      });

      await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'User Public List',
        isPublic: true,
      });

      await factory.kanjiLists.createKanjiList(user2.id, {
        name: 'Other User Public List',
        isPublic: true,
      });

      await factory.kanjiLists.createKanjiList(user2.id, {
        name: 'Other User Private List',
        isPublic: false,
      });
    });

    it('should return user own lists and public lists', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.data)).toBe(true);
      // Should see: own private + own public + other public = 3 lists
      expect(response.body.data.data.length).toBe(3);
    });

    it('should support search by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists?search=User Public')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.data.length).toBeGreaterThan(0);
      const names = response.body.data.data.map((list: any) => list.name);
      expect(names.some((name: string) => name.includes('User Public'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists?limit=2&offset=0')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.data.length).toBeLessThanOrEqual(2);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  // ==================== GET SINGLE KANJI LIST ====================

  describe('GET /kanji-lists/:id', () => {
    let testList: any;
    let testKanji: any;

    beforeEach(async () => {
      testKanji = await factory.kanji.createKanji({ 
        character: '春', 
        meanings: 'spring',
        jlpt: 3,
      });

      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Test List',
        description: 'Test description',
      });

      await factory.kanjiLists.addKanjiToList(testList.id, testKanji.id);
    });

    it('should return list with kanji items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(testList.id);
      expect(response.body.data.name).toBe('Test List');
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].kanji.character).toBe('春');
    });

    it('should allow access to own private list', async () => {
      await request(app.getHttpServer())
        .get(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should deny access to other user private list', async () => {
      await request(app.getHttpServer())
        .get(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should allow access to public list by anyone', async () => {
      await prisma.kanjiList.update({
        where: { id: testList.id },
        data: { isPublic: true },
      });

      await request(app.getHttpServer())
        .get(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .get('/kanji-lists/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  // ==================== UPDATE KANJI LIST ====================

  describe('PUT/PATCH /kanji-lists/:id', () => {
    let testList: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Original Name',
        description: 'Original description',
        isPublic: false,
      });
    });

    it('should update list name and description', async () => {
      const response = await request(app.getHttpServer())
        .put(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update list visibility', async () => {
      const response = await request(app.getHttpServer())
        .put(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          isPublic: true,
        })
        .expect(200);

      expect(response.body.data.isPublic).toBe(true);
    });

    it('should work with PATCH method', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Patched Name',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Patched Name');
    });

    it('should fail to update other user list', async () => {
      await request(app.getHttpServer())
        .put(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .put('/kanji-lists/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated',
        })
        .expect(404);
    });
  });

  // ==================== DELETE KANJI LIST ====================

  describe('DELETE /kanji-lists/:id', () => {
    let testList: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'List to Delete',
      });
    });

    it('should delete own list', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const deleted = await prisma.kanjiList.findUnique({
        where: { id: testList.id },
      });
      expect(deleted).toBeNull();
    });

    it('should fail to delete other user list', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should cascade delete list items', async () => {
      const kanji = await factory.kanji.createKanji({ character: '火', meanings: 'fire' });
      await factory.kanjiLists.addKanjiToList(testList.id, kanji.id);

      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const items = await prisma.kanjiListItem.findMany({
        where: { listId: testList.id },
      });
      expect(items.length).toBe(0);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .delete('/kanji-lists/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  // ==================== ADD/REMOVE KANJI ====================

  describe('POST /kanji-lists/:id/kanji/:kanjiId', () => {
    let testList: any;
    let testKanji: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Test List',
      });

      testKanji = await factory.kanji.createKanji({
        character: '水',
        meanings: 'water',
      });
    });

    it('should add kanji to list', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/kanji/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.listId).toBe(testList.id);
      expect(response.body.data.kanjiId).toBe(testKanji.id);
    });

    it('should fail to add duplicate kanji', async () => {
      await factory.kanjiLists.addKanjiToList(testList.id, testKanji.id);

      await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/kanji/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409);
    });

    it('should fail to add to other user list', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/kanji/${testKanji.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should fail with non-existent kanji', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/kanji/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('DELETE /kanji-lists/:id/kanji/:kanjiId', () => {
    let testList: any;
    let testKanji: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Test List',
      });

      testKanji = await factory.kanji.createKanji({
        character: '木',
        meanings: 'tree, wood',
      });

      await factory.kanjiLists.addKanjiToList(testList.id, testKanji.id);
    });

    it('should remove kanji from list', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}/kanji/${testKanji.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const item = await prisma.kanjiListItem.findFirst({
        where: {
          listId: testList.id,
          kanjiId: testKanji.id,
        },
      });
      expect(item).toBeNull();
    });

    it('should fail to remove from other user list', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}/kanji/${testKanji.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should return 404 for non-existent item', async () => {
      await request(app.getHttpServer())
        .delete(`/kanji-lists/${testList.id}/kanji/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  // ==================== JLPT LISTS ====================

  describe('GET /kanji-lists/jlpt/:level', () => {
    beforeEach(async () => {
      // Create JLPT-specific lists
      const n5Category = await factory.categories.createCategory({ name: 'JLPT N5' });
      
      await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Official N5 List',
        categoryId: n5Category.id,
        isPublic: true,
      });
    });

    it('should return JLPT N5 lists', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists/jlpt/N5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept lowercase jlpt level', async () => {
      await request(app.getHttpServer())
        .get('/kanji-lists/jlpt/n5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should reject invalid JLPT level', async () => {
      await request(app.getHttpServer())
        .get('/kanji-lists/jlpt/N6')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  // ==================== PUBLISH WORKFLOW ====================

  describe('POST /kanji-lists/:id/publish', () => {
    let testList: any;
    let testKanji: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'List to Publish',
        isPublic: false,
      });
      
      // Add at least one kanji to the list (cannot publish empty list)
      testKanji = await factory.kanji.createKanji({
        character: '日',
        meanings: 'sun, day',
      });
      await factory.kanjiLists.addKanjiToList(testList.id, testKanji.id, 1);
    });

    it('should request publish for own list', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending'); // lowercase as per schema
      expect(response.body.data.listId).toBe(testList.id); // 'listId' not 'kanjiListId'
    });

    it('should fail to request publish for other user list', async () => {
      await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/publish`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should fail to request publish for already public list', async () => {
      await prisma.kanjiList.update({
        where: { id: testList.id },
        data: { isPublic: true },
      });

      await request(app.getHttpServer())
        .post(`/kanji-lists/${testList.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  describe('GET /kanji-lists/admin/publish-requests', () => {
    beforeEach(async () => {
      const list1 = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Pending List 1',
      });

      const list2 = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'Pending List 2',
      });

      await prisma.kanjiListPublishRequest.create({
        data: {
          listId: list1.id,
          userId: regularUser.id,
          status: 'PENDING',
          
        },
      });

      await prisma.kanjiListPublishRequest.create({
        data: {
          listId: list2.id,
          userId: user2.id,
          status: 'APPROVED',
          
          reviewedBy: adminUser.id,
        },
      });
    });

    it('should return all publish requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists/admin/publish-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/kanji-lists/admin/publish-requests?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every((req: any) => req.status === 'PENDING')).toBe(true);
    });
  });

  describe('POST /kanji-lists/admin/publish-requests/:id/approve', () => {
    let publishRequest: any;
    let testList: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'List to Approve',
        isPublic: false,
      });

      // Add at least one kanji to the list
      const testKanji = await factory.kanji.createKanji({
        character: '月',
        meanings: 'moon, month',
      });
      await factory.kanjiLists.addKanjiToList(testList.id, testKanji.id, 1);

      publishRequest = await prisma.kanjiListPublishRequest.create({
        data: {
          listId: testList.id,
          userId: regularUser.id,
          status: 'pending', // lowercase as per schema
        },
      });
    });

    it('should approve publish request and make list public', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/admin/publish-requests/${publishRequest.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('approved'); // lowercase

      const updatedList = await prisma.kanjiList.findUnique({
        where: { id: testList.id },
      });
      expect(updatedList?.isPublic).toBe(true);
    });

    it('should fail to approve non-existent request', async () => {
      await request(app.getHttpServer())
        .post('/kanji-lists/admin/publish-requests/99999/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /kanji-lists/admin/publish-requests/:id/reject', () => {
    let publishRequest: any;
    let testList: any;

    beforeEach(async () => {
      testList = await factory.kanjiLists.createKanjiList(regularUser.id, {
        name: 'List to Reject',
        isPublic: false,
      });

      publishRequest = await prisma.kanjiListPublishRequest.create({
        data: {
          listId: testList.id,
          userId: regularUser.id,
          status: 'pending', // lowercase
          
        },
      });
    });

    it('should reject publish request with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/admin/publish-requests/${publishRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Insufficient content',
        })
        .expect(200);

      expect(response.body.data.status).toBe('rejected'); // lowercase
      expect(response.body.data.message).toBe('Insufficient content'); // stored as 'message' field

      const updatedList = await prisma.kanjiList.findUnique({
        where: { id: testList.id },
      });
      expect(updatedList?.isPublic).toBe(false);
    });

    it('should reject without reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/kanji-lists/admin/publish-requests/${publishRequest.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.status).toBe('rejected'); // lowercase
    });
  });

  // ==================== INTEGRATION SCENARIOS ====================

  describe('Complete Kanji List Workflow', () => {
    it('should complete full lifecycle: create, add items, publish, approve', async () => {
      // 1. Create list
      const createResponse = await request(app.getHttpServer())
        .post('/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Complete Workflow List',
          description: 'Testing full workflow',
        })
        .expect(201);

      const listId = createResponse.body.data.id;

      // 2. Add kanji to list
      const kanji1 = await factory.kanji.createKanji({ character: '山', meanings: 'mountain' });
      const kanji2 = await factory.kanji.createKanji({ character: '川', meanings: 'river' });

      await request(app.getHttpServer())
        .post(`/kanji-lists/${listId}/kanji/${kanji1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/kanji-lists/${listId}/kanji/${kanji2.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      // 3. Verify list has items
      const getResponse = await request(app.getHttpServer())
        .get(`/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body.data.items.length).toBe(2);

      // 4. Request publish
      const publishResponse = await request(app.getHttpServer())
        .post(`/kanji-lists/${listId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      const requestId = publishResponse.body.data.id;

      // 5. Admin approves (returns 200 OK due to @HttpCode decorator)
      await request(app.getHttpServer())
        .post(`/kanji-lists/admin/publish-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // @HttpCode(200) in controller

      // 6. Verify list is now public
      const finalResponse = await request(app.getHttpServer())
        .get(`/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(finalResponse.body.data.isPublic).toBe(true);
    });
  });
});
