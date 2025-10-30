import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('Admin Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: number;
  let userToken: string;
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
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Cleanup database
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" RESTART IDENTITY CASCADE');

    const timestamp = Date.now();

    // Create admin user
    const adminRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `admin-${timestamp}@test.com`,
        password: 'AdminPass123!',
        name: 'Admin User',
      });

    adminId = adminRegister.body.data.user.id;

    // Set admin role
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    // Re-login to get fresh token with admin role
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: `admin-${timestamp}@test.com`,
        password: 'AdminPass123!',
      });
    adminToken = adminLogin.body.data.accessToken;

    // Create regular user
    const userRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `user-${timestamp}@test.com`,
        password: 'UserPass123!',
        name: 'Regular User',
      });

    userId = userRegister.body.data.user.id;
    userToken = userRegister.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // ==================== DASHBOARD OVERVIEW ====================

  describe('GET /admin/dashboard/overview', () => {
    it('should get dashboard overview as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('activity');

      expect(response.body.data.users).toHaveProperty('total');
      expect(response.body.data.users).toHaveProperty('active');
      expect(response.body.data.users).toHaveProperty('new');

      expect(response.body.data.content).toHaveProperty('kanji');
      expect(response.body.data.content).toHaveProperty('quizzes');
      expect(response.body.data.content).toHaveProperty('lists');
      expect(response.body.data.content).toHaveProperty('decks');

      expect(response.body.data.activity).toHaveProperty('activeUsers');
      expect(response.body.data.activity).toHaveProperty('pendingPublishRequests');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/overview')
        .expect(401);
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/overview')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== USER STATISTICS ====================

  describe('GET /admin/dashboard/stats/users', () => {
    it('should get user statistics as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('newUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should support period filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/users')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/stats/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== CONTENT STATISTICS ====================

  describe('GET /admin/dashboard/stats/content', () => {
    it('should get content statistics as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('quizzes');
      expect(response.body.data).toHaveProperty('lists');
      expect(response.body.data).toHaveProperty('decks');
    });

    it('should support period filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/content')
        .query({ period: 'week' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });
  });

  // ==================== ACTIVITY STATISTICS ====================

  describe('GET /admin/dashboard/stats/activity', () => {
    it('should get activity statistics as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should support period and limit filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/stats/activity')
        .query({ period: 'month', limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });
  });

  // ==================== USER CHART DATA ====================

  describe('GET /admin/dashboard/charts/users', () => {
    it('should get user chart data as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/charts/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should support different periods', async () => {
      const periods = ['week', 'month', 'year'];

      for (const period of periods) {
        const response = await request(app.getHttpServer())
          .get('/admin/dashboard/charts/users')
          .query({ period })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data).toBeTruthy();
      }
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/charts/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== ACTIVITY CHART DATA ====================

  describe('GET /admin/dashboard/charts/activity', () => {
    it('should get activity chart data as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/charts/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should support period filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard/charts/activity')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });
  });

  // ==================== PUBLISH REQUESTS ====================

  describe('GET /admin/publish/requests', () => {
    it('should get all publish requests as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/publish/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/publish/requests')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should filter by type', async () => {
      const types = ['quiz', 'list', 'deck'];

      for (const type of types) {
        const response = await request(app.getHttpServer())
          .get('/admin/publish/requests')
          .query({ type })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data).toBeTruthy();
      }
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/publish/requests')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/publish/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== PUBLISH STATISTICS ====================

  describe('GET /admin/publish/statistics', () => {
    it('should get publish statistics as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/publish/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/publish/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== SYSTEM HEALTH ====================

  describe('GET /admin/system/health', () => {
    it('should get system health as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
      // Typically returns database connection status, memory usage, etc.
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/system/health')
        .expect(401);
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== SYSTEM METRICS ====================

  describe('GET /admin/system/metrics', () => {
    it('should get system metrics as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should support period filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/system/metrics')
        .query({ period: 'week' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeTruthy();
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get('/admin/system/metrics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== EDGE CASES & AUTHORIZATION ====================

  describe('Authorization & Edge Cases', () => {
    it('should consistently block non-admin users from all admin endpoints', async () => {
      const endpoints = [
        '/admin/dashboard/overview',
        '/admin/dashboard/stats/users',
        '/admin/dashboard/stats/content',
        '/admin/dashboard/stats/activity',
        '/admin/dashboard/charts/users',
        '/admin/dashboard/charts/activity',
        '/admin/publish/requests',
        '/admin/publish/statistics',
        '/admin/system/health',
        '/admin/system/metrics',
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      }
    });

    it('should require authentication for all admin endpoints', async () => {
      const endpoints = [
        '/admin/dashboard/overview',
        '/admin/dashboard/stats/users',
        '/admin/system/health',
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .expect(401);
      }
    });
  });
});
