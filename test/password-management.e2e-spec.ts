import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';

describe('Password Management (e2e)', () => {
  let app: INestApplication;
  let prisma: any; // Use any to bypass TypeScript errors with Prisma client
  let testUser: {
    email: string;
    password: string;
    username: string;
    accessToken?: string;
  };
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<DbClient>(DbClient);

    // Generate unique test user
    const timestamp = Date.now();
    testUser = {
      email: `test.e2e.${timestamp}@example.com`,
      password: 'Test123!@#',
      username: `testuser${timestamp}`,
    };
  });

  afterAll(async () => {
    // Cleanup: Delete test user
    if (testUser.email) {
      await prisma.users.deleteMany({
        where: { email: testUser.email },
      });
    }

    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          username: testUser.username,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email', testUser.email);
          expect(res.body).toHaveProperty('username', testUser.username);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          username: 'anotherusername',
        })
        .expect(409);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak.${Date.now()}@example.com`,
          password: '123',
          username: 'weakpass',
        })
        .expect(400);
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: testUser.password,
          username: 'invalidmail',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          testUser.accessToken = res.body.access_token;
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          oldPassword: testUser.password,
          newPassword: 'NewTest123!@#',
        })
        .expect(401);
    });

    it('should fail with wrong old password', () => {
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          oldPassword: 'WrongOldPassword123!',
          newPassword: 'NewTest123!@#',
        })
        .expect(400);
    });

    it('should change password successfully', () => {
      const newPassword = 'NewTest123!@#';
      return request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          oldPassword: testUser.password,
          newPassword: newPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          // Update password for subsequent tests
          testUser.password = newPassword;
        });
    });

    it('should login with new password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          testUser.accessToken = res.body.access_token;
        });
    });

    it('should fail to login with old password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Test123!@#', // Original password
        })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send reset email for existing user', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUser.email,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should not reveal if email does not exist', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should create reset token in database', async () => {
      const user = await prisma.users.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeTruthy();

      const token = await prisma.passwordResetToken.findFirst({
        where: {
          user_id: user!.id,
          used: false,
        },
        orderBy: { created_at: 'desc' },
      });

      expect(token).toBeTruthy();
      expect(token!.expires_at.getTime()).toBeGreaterThan(Date.now());
      resetToken = token!.token;
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token-123',
          newPassword: 'ResetTest123!@#',
        })
        .expect(400);
    });

    it('should reset password with valid token', () => {
      const resetPassword = 'ResetTest123!@#';
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: resetPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          testUser.password = resetPassword;
        });
    });

    it('should mark token as used', async () => {
      const token = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken },
      });

      expect(token).toBeTruthy();
      expect(token!.used).toBe(true);
    });

    it('should fail to reuse same token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        })
        .expect(400);
    });

    it('should login with new reset password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          testUser.accessToken = res.body.access_token;
        });
    });
  });

  describe('Full Flow Integration', () => {
    it('should complete full password lifecycle', async () => {
      // 1. Register
      const timestamp = Date.now();
      const newUser = {
        email: `fullflow.${timestamp}@example.com`,
        password: 'Initial123!@#',
        username: `fullflow${timestamp}`,
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      // 2. Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(201);

      const token = loginRes.body.access_token;

      // 3. Change password
      const changedPassword = 'Changed123!@#';
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: newUser.password,
          newPassword: changedPassword,
        })
        .expect(201);

      // 4. Login with new password
      const loginRes2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: changedPassword,
        })
        .expect(201);

      expect(loginRes2.body).toHaveProperty('access_token');

      // 5. Forgot password
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: newUser.email,
        })
        .expect(201);

      // 6. Get reset token
      const fullFlowUser = await prisma.users.findUnique({
        where: { email: newUser.email },
      });

      expect(fullFlowUser).toBeTruthy();

      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: {
          user_id: fullFlowUser!.id,
          used: false,
        },
        orderBy: { created_at: 'desc' },
      });

      expect(resetTokenRecord).toBeTruthy();

      // 7. Reset password
      const resetPassword = 'Reset123!@#';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetTokenRecord!.token,
          newPassword: resetPassword,
        })
        .expect(201);

      // 8. Login with reset password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: resetPassword,
        })
        .expect(201);

      // Cleanup
      await prisma.users.deleteMany({
        where: { email: newUser.email },
      });
    });
  });
});
