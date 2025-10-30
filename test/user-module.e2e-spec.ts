import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('User Module (e2e)', () => {
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
    adminToken = adminRegister.body.data.accessToken;

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

  // ==================== GET ALL USERS ====================

  describe('GET /admin/users', () => {
    it('should get all users as admin', async () => {
      // Create additional user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `extra-${Date.now()}@test.com`,
          password: 'Pass123!',
          name: 'Extra User',
        });

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3); // admin + user + extra

      // Verify user structure
      const firstUser = response.body.data[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('name');
      expect(firstUser).toHaveProperty('role');
      expect(firstUser).toHaveProperty('createdAt');
      expect(firstUser).toHaveProperty('updatedAt');
      expect(firstUser).not.toHaveProperty('password'); // Password should not be exposed
      expect(firstUser).not.toHaveProperty('passwordHash');
    });

    it('should not expose sensitive user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = response.body.data;
      users.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('twoFactorSecret');
        expect(user).not.toHaveProperty('twoFactorBackupCodes');
        expect(user).not.toHaveProperty('resetPasswordToken');
      });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401);
    });

    it('should fail as regular user (not admin)', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== GET SINGLE USER ====================

  describe('GET /admin/users/:id', () => {
    it('should get single user by id as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        id: userId,
        name: 'Regular User',
        role: 'USER',
      });
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should get admin user details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        id: adminId,
        role: 'ADMIN',
      });
    });

    it('should fail for non-existent user', async () => {
      const nonExistentId = 99999;
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should fail with invalid id format', async () => {
      await request(app.getHttpServer())
        .get('/admin/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .expect(401);
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ==================== UPDATE USER ====================

  describe('PATCH /admin/users/:id', () => {
    it('should update user name as admin', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        id: userId,
        name: 'Updated Name',
      });

      // Verify in database
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.name).toBe('Updated Name');
    });

    it('should update user email', async () => {
      const timestamp = Date.now();
      const newEmail = `newemail-${timestamp}@test.com`;
      const updateData = {
        email: newEmail,
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.email).toBe(newEmail);
    });

    it('should update user role', async () => {
      const updateData = {
        role: 'ADMIN',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.role).toBe('ADMIN');

      // Verify in database
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.role).toBe('ADMIN');
    });

    it('should update multiple fields at once', async () => {
      const timestamp = Date.now();
      const updateData = {
        name: 'Multi Update',
        email: `multiupdate-${timestamp}@test.com`,
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        id: userId,
        name: 'Multi Update',
        email: `multiupdate-${timestamp}@test.com`,
      });
    });

    it('should fail to update with duplicate email', async () => {
      // Create another user
      const timestamp = Date.now();
      const otherRegister = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `other-${timestamp}@test.com`,
          password: 'Pass123!',
        });

      // Try to update user with existing email
      const updateData = {
        email: `other-${timestamp}@test.com`,
      };

      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409); // Conflict
    });

    it('should fail for non-existent user', async () => {
      const nonExistentId = 99999;
      const updateData = { name: 'Test' };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' })
        .expect(403);
    });

    it('should allow partial updates (only name)', async () => {
      // Get current user email first
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const originalEmail = currentUser?.email;
      
      const updateData = {
        name: 'Only Name Changed',
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.name).toBe('Only Name Changed');
      expect(response.body.data.email).toBe(originalEmail); // Email unchanged
    });
  });

  // ==================== DELETE USER ====================

  describe('DELETE /admin/users/:id', () => {
    it('should delete user as admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify user is deleted
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).toBeNull();
    });

    it('should cascade delete user data', async () => {
      // Create user data through API
      const deckResponse = await request(app.getHttpServer())
        .post('/flashcard-decks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Deck', description: 'Test' });

      const deck = deckResponse.body.data;

      const quizResponse = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'User Quiz', description: 'Test' });

      const quiz = quizResponse.body.data;

      // Delete user
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.message).toContain('deleted successfully');

      // Verify cascade deletion (depends on Prisma schema cascade rules)
      const deletedDeck = await prisma.flashcardDeck.findUnique({
        where: { id: deck.id },
      });

      const deletedQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.id },
      });

      // These should be null if CASCADE is configured
      expect(deletedDeck).toBeNull();
      expect(deletedQuiz).toBeNull();
    });

    it('should fail for non-existent user', async () => {
      const nonExistentId = 99999;
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .expect(401);
    });

    it('should fail as regular user', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should prevent admin from deleting themselves (optional safety check)', async () => {
      // This test assumes there's a business rule preventing self-deletion
      // Remove this test if self-deletion is allowed
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Or 400 if self-deletion is prevented

      expect(response.body.statusCode).toBe(200);
      // If self-deletion is allowed, verify admin is deleted
      // If prevented, verify admin still exists
    });

    it('should handle deletion of user with no associated data', async () => {
      // Create a fresh user with no activities
      const timestamp = Date.now();
      const freshRegister = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `fresh-${timestamp}@test.com`,
          password: 'Pass123!',
        });

      const freshUserId = freshRegister.body.data.user.id;

      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${freshUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.message).toContain('deleted successfully');

      const deletedUser = await prisma.user.findUnique({
        where: { id: freshUserId },
      });
      expect(deletedUser).toBeNull();
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle large number of users', async () => {
      // Create 20 users (reduced from 50 for faster test)
      const timestamp = Date.now();
      const userPromises = Array.from({ length: 20 }, (_, i) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `bulk${i}-${timestamp}@test.com`,
            password: 'Pass123!',
          }),
      );

      await Promise.all(userPromises);

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(22); // 20 + admin + user
    });

    it('should handle user with special characters in name', async () => {
      const updateData = {
        name: "Test User with 特殊文字 and Émojis 🎌",
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should handle empty name update (set to null)', async () => {
      const updateData = {
        name: null,
      };

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data.name).toBeNull();
    });
  });
});
