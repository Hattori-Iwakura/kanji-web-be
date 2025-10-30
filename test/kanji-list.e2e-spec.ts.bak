import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/shared/services/prisma.service';
import { KanjiListService } from '../src/modules/kanji-list_new/kanji-list.service';
import { KanjiListModule } from '../src/modules/kanji-list_new/kanji-list.module';

describe('KanjiListService (Integration)', () => {
  let service: KanjiListService;
  let prisma: PrismaService;
  let adminId: number;
  let userId: number;
  let kanjiId1: number;
  let kanjiId2: number;
  let listId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [KanjiListModule],
    }).compile();

    service = module.get<KanjiListService>(KanjiListService);
    prisma = module.get<PrismaService>(PrismaService);

    // Cleanup
    await prisma.$transaction([
      prisma.kanjiListItem.deleteMany(),
      prisma.kanjiListPublishRequest.deleteMany(),
      prisma.kanjiList.deleteMany(),
      prisma.kanji.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Create test users
    const adminRes = await request(app.getHttpServer())
      .post('/api/api/auth/register')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin User',
      });
    adminId = adminRes.body.user.id;

    // Update admin role
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      });
    adminToken = adminLogin.body.token;

    const userRes = await request(app.getHttpServer())
      .post('/api/api/auth/register')
      .send({
        email: 'user@test.com',
        password: 'password123',
        name: 'Regular User',
      });
    userId = userRes.body.user.id;

    const userLogin = await request(app.getHttpServer())
      .post('/api/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'password123',
      });
    userToken = userLogin.body.token;

    // Create test kanji
    const kanji1 = await prisma.kanji.create({
      data: {
        character: '一',
        meanings: 'one',
        onyomi: 'イチ',
        kunyomi: 'ひと',
        jlpt: 5,
      },
    });
    kanjiId1 = kanji1.id;

    const kanji2 = await prisma.kanji.create({
      data: {
        character: '二',
        meanings: 'two',
        onyomi: 'ニ',
        kunyomi: 'ふた',
        jlpt: 5,
      },
    });
    kanjiId2 = kanji2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /kanji-lists', () => {
    it('should create a new list with kanji', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My First List',
          description: 'Test list',
          kanjiIds: [kanjiId1, kanjiId2],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('My First List');
      expect(response.body.isPublic).toBe(false);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].kanji.character).toBe('一');
      expect(response.body.items[1].kanji.character).toBe('二');

      listId = response.body.id;
    });

    it('should create an empty list', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Empty List',
        })
        .expect(201);

      expect(response.body.items).toHaveLength(0);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .send({
          name: 'Unauthorized List',
        })
        .expect(401);
    });

    it('should fail with invalid kanji IDs', async () => {
      await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Invalid List',
          kanjiIds: [99999],
        })
        .expect(400);
    });
  });

  describe('GET /kanji-lists', () => {
    beforeAll(async () => {
      // Create a public list
      await prisma.kanjiList.create({
        data: {
          name: 'Public List',
          userId: adminId,
          isPublic: true,
          items: {
            create: [{ kanjiId: kanjiId1, order: 0 }],
          },
        },
      });
    });

    it('should get all public lists (unauthenticated)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.every((list: any) => list.isPublic)).toBe(true);
    });

    it('should get public + own lists (authenticated)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists?search=Public')
        .expect(200);

      expect(response.body.data.every((list: any) => 
        list.name.includes('Public') || list.description?.includes('Public')
      )).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists?limit=1&offset=0')
        .expect(200);

      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /kanji-lists/:id', () => {
    it('should get a public list', async () => {
      const lists = await prisma.kanjiList.findMany({ where: { isPublic: true } });
      const publicListId = lists[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/kanji-lists/${publicListId}`)
        .expect(200);

      expect(response.body.id).toBe(publicListId);
      expect(response.body).toHaveProperty('items');
    });

    it('should get own private list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(listId);
    });

    it('should fail to get another user\'s private list', async () => {
      await request(app.getHttpServer())
        .get(`/api/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent list', async () => {
      await request(app.getHttpServer())
        .get('/api/kanji-lists/99999')
        .expect(404);
    });
  });

  describe('PUT /kanji-lists/:id', () => {
    it('should update list details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated List Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated List Name');
      expect(response.body.description).toBe('Updated description');
    });

    it('should fail without ownership', async () => {
      await request(app.getHttpServer())
        .put(`/api/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/kanji-lists/${listId}`)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(401);
    });
  });

  describe('POST /kanji-lists/:id/kanji/:kanjiId', () => {
    it('should add kanji to list', async () => {
      // Create a new empty list
      const newList = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Add Kanji Test' });

      const newListId = newList.body.id;

      const response = await request(app.getHttpServer())
        .post(`/api/kanji-lists/${newListId}/kanji/${kanjiId1}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].kanji.id).toBe(kanjiId1);
    });

    it('should fail to add duplicate kanji', async () => {
      await request(app.getHttpServer())
        .post(`/api/kanji-lists/${listId}/kanji/${kanjiId1}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should fail with non-existent kanji', async () => {
      await request(app.getHttpServer())
        .post(`/api/kanji-lists/${listId}/kanji/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('DELETE /kanji-lists/:id/kanji/:kanjiId', () => {
    it('should remove kanji from list', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/kanji-lists/${listId}/kanji/${kanjiId1}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.items.find((item: any) => item.kanjiId === kanjiId1)).toBeUndefined();
    });

    it('should fail to remove non-existent kanji', async () => {
      await request(app.getHttpServer())
        .delete(`/api/kanji-lists/${listId}/kanji/99999`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('POST /kanji-lists/:id/publish', () => {
    let publishListId: number;

    beforeAll(async () => {
      const newList = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Publish Test List',
          kanjiIds: [kanjiId1],
        });
      publishListId = newList.body.id;
    });

    it('should submit publish request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/kanji-lists/${publishListId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      expect(response.body.listId).toBe(publishListId);
    });

    it('should fail to submit duplicate publish request', async () => {
      await request(app.getHttpServer())
        .post(`/api/kanji-lists/${publishListId}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should fail to publish empty list', async () => {
      const emptyList = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Empty' });

      await request(app.getHttpServer())
        .post(`/api/kanji-lists/${emptyList.body.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });

  describe('GET /kanji-lists/admin/publish-requests', () => {
    it('should get all publish requests (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists/admin/publish-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/kanji-lists/admin/publish-requests?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.every((req: any) => req.status === 'pending')).toBe(true);
    });
  });

  describe('POST /kanji-lists/admin/publish-requests/:id/approve', () => {
    it('should approve publish request', async () => {
      const requests = await prisma.kanjiListPublishRequest.findMany({
        where: { status: 'pending' },
      });
      const requestId = requests[0].id;
      const requestListId = requests[0].listId;

      const response = await request(app.getHttpServer())
        .post(`/api/kanji-lists/admin/publish-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body.message).toBe('Publish request approved');

      // Verify list is now public
      const list = await prisma.kanjiList.findUnique({ where: { id: requestListId } });
      expect(list?.isPublic).toBe(true);

      // Verify request status
      const updatedRequest = await prisma.kanjiListPublishRequest.findUnique({
        where: { id: requestId },
      });
      expect(updatedRequest?.status).toBe('approved');
      expect(updatedRequest?.reviewedBy).toBe(adminId);
    });

    it('should fail to approve non-pending request', async () => {
      const requests = await prisma.kanjiListPublishRequest.findMany({
        where: { status: 'approved' },
      });
      if (requests.length > 0) {
        await request(app.getHttpServer())
          .post(`/api/kanji-lists/admin/publish-requests/${requests[0].id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      }
    });
  });

  describe('POST /kanji-lists/admin/publish-requests/:id/reject', () => {
    let rejectRequestId: number;

    beforeAll(async () => {
      const newList = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Reject Test List',
          kanjiIds: [kanjiId2],
        });

      const publishReq = await request(app.getHttpServer())
        .post(`/api/kanji-lists/${newList.body.id}/publish`)
        .set('Authorization', `Bearer ${userToken}`);

      rejectRequestId = publishReq.body.id;
    });

    it('should reject publish request with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/kanji-lists/admin/publish-requests/${rejectRequestId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'List quality does not meet standards',
        })
        .expect(201);

      expect(response.body.message).toBe('Publish request rejected');

      // Verify request status
      const updatedRequest = await prisma.kanjiListPublishRequest.findUnique({
        where: { id: rejectRequestId },
      });
      expect(updatedRequest?.status).toBe('rejected');
      expect(updatedRequest?.reviewedBy).toBe(adminId);
      expect(updatedRequest?.message).toBe('List quality does not meet standards');
    });
  });

  describe('DELETE /kanji-lists/:id', () => {
    it('should delete own list', async () => {
      const newList = await request(app.getHttpServer())
        .post('/api/kanji-lists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'To Delete' });

      await request(app.getHttpServer())
        .delete(`/api/kanji-lists/${newList.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify deleted
      const deleted = await prisma.kanjiList.findUnique({
        where: { id: newList.body.id },
      });
      expect(deleted).toBeNull();
    });

    it('should fail to delete another user\'s list', async () => {
      await request(app.getHttpServer())
        .delete(`/api/kanji-lists/${listId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
