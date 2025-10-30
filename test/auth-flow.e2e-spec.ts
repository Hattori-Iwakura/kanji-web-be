import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: number;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
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
  });

  afterAll(async () => {
    // Cleanup test user
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.email).toBe(testUser.email);
          expect(response.body.name).toBe(testUser.name);
          expect(response.body).not.toHaveProperty('passwordHash');
          expect(response.body).not.toHaveProperty('password');
          userId = response.body.id;
        });
    });

    it('should fail to register with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(409);
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          password: '123', // Too weak
        })
        .expect(400);
    });

    it('should fail without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should login successfully with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('user');
          expect(response.body.user.email).toBe(testUser.email);
          expect(response.body.user).not.toHaveProperty('passwordHash');
          accessToken = response.body.accessToken;
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should fail without credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.email).toBe(testUser.email);
          expect(response.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/auth/profile (PATCH)', () => {
    it('should update profile successfully', () => {
      const updatedName = 'Updated Test User';
      return request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: updatedName,
        })
        .expect(200)
        .then((response) => {
          expect(response.body.name).toBe(updatedName);
          expect(response.body.email).toBe(testUser.email);
        });
    });

    it('should fail to update profile without token', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/profile')
        .send({
          name: 'New Name',
        })
        .expect(401);
    });

    it('should accept optional fields only', () => {
      return request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          profileImage: 'https://example.com/avatar.jpg',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.profileImage).toBe(
            'https://example.com/avatar.jpg',
          );
        });
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken: string;

    it('POST /api/auth/forgot-password should send reset email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('sent');
        });
    });

    it('should create reset token in database', async () => {
      const token = await prisma.passwordResetToken.findFirst({
        where: {
          userId: userId,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(token).toBeDefined();
      expect(token?.token).toBeDefined();
      resetToken = token!.token;
    });

    it('GET /api/auth/validate-reset-token/:token should validate token', () => {
      return request(app.getHttpServer())
        .get(`/api/auth/validate-reset-token/${resetToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.valid).toBe(true);
        });
    });

    it('POST /api/auth/reset-password should reset password', () => {
      const newPassword = 'NewPassword123!';
      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('success');
        });
    });

    it('should login with new password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.email,
          password: 'NewPassword123!',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('accessToken');
        });
    });

    it('should fail to login with old password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: testUser.email,
          password: testUser.password, // Old password
        })
        .expect(401);
    });

    it('should mark token as used after reset', async () => {
      const token = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken },
      });

      expect(token).toBeNull(); // Token should be deleted after use
    });
  });

  describe('2FA Flow', () => {
    let twoFASecret: string;

    it('POST /api/auth/2fa/setup should setup 2FA', () => {
      return request(app.getHttpServer())
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('secret');
          expect(response.body).toHaveProperty('qrCodeUrl');
          twoFASecret = response.body.secret;
        });
    });

    it('POST /api/auth/2fa/send-email-otp should send OTP via email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/2fa/send-email-otp')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('sent');
        });
    });

    it('should create OTP in database', async () => {
      const otp = await prisma.twoFactorOtp.findFirst({
        where: {
          userId: userId,
          used: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(otp).toBeDefined();
      expect(otp?.code).toHaveLength(6);
      expect(otp?.code).toMatch(/^\d{6}$/);
    });

    it('POST /api/auth/2fa/disable should disable 2FA', () => {
      return request(app.getHttpServer())
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.message).toContain('disabled');
        });
    });
  });

  describe('Authorization & Security', () => {
    it('should not access admin endpoints with regular user', () => {
      return request(app.getHttpServer())
        .get('/api/admin/dashboard/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should reject requests with expired tokens', () => {
      const expiredToken = 'expired.token.here';
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should validate request body schemas', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short', // Too short
          extraField: 'not allowed', // Should be stripped
        })
        .expect(400);
    });

    it('should sanitize error messages', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: 'nonexistent@example.com',
          password: 'anypassword',
        })
        .expect(401)
        .then((response) => {
          // Should not reveal if email exists or not
          expect(response.body.message).not.toContain('email');
          expect(response.body.message).not.toContain('user not found');
        });
    });
  });

  describe('Rate Limiting & Performance', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`),
        );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond quickly to authenticated requests', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
