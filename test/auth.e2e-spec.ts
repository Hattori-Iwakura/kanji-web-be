import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';
import { TransformInterceptor } from '../src/interceptors/transform/transform.interceptor';

describe('Auth Module (e2e)', () => {
  let app: INestApplication;
  let dbClient: DbClient;
  let testUserId: number;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
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
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await dbClient.sessions.deleteMany({
        where: { user_id: testUserId },
      });
      await dbClient.users.delete({
        where: { id: testUserId },
      });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const timestamp = Date.now();
      const newUser = {
        account: `testuser_${timestamp}`,
        password: 'Test123!@#',
        email: `test_${timestamp}@example.com`,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('account', newUser.account);
      expect(response.body.data).toHaveProperty('email', newUser.email);
      expect(response.body.data).not.toHaveProperty('password');
      
      testUserId = response.body.data.id;
    });

    it('should fail with duplicate account', async () => {
      const timestamp = Date.now();
      const user = {
        account: `duplicate_${timestamp}`,
        password: 'Test123!@#',
        email: `duplicate_${timestamp}@example.com`,
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });

    it('should fail with duplicate email', async () => {
      const timestamp = Date.now();
      const email = `same_email_${timestamp}@example.com`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: `user1_${timestamp}`,
          password: 'Test123!@#',
          email: email,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: `user2_${timestamp}`,
          password: 'Test123!@#',
          email: email,
        })
        .expect(409);
    });

    it('should fail with invalid email format', async () => {
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: `user_${timestamp}`,
          password: 'Test123!@#',
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should fail with weak password', async () => {
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: `user_${timestamp}`,
          password: '123',
          email: `test_${timestamp}@example.com`,
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: 'testuser',
        })
        .expect(400);
    });

    it('should fail with empty account', async () => {
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: '',
          password: 'Test123!@#',
          email: `test_${timestamp}@example.com`,
        })
        .expect(400);
    });

    it('should fail with account containing spaces', async () => {
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: 'test user',
          password: 'Test123!@#',
          email: `test_${timestamp}@example.com`,
        })
        .expect(400);
    });

    it('should fail with account too short', async () => {
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: 'ab',
          password: 'Test123!@#',
          email: `test_${timestamp}@example.com`,
        })
        .expect(400);
    });

    it('should fail with account too long', async () => {
      const timestamp = Date.now();
      const longAccount = 'a'.repeat(51);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: longAccount,
          password: 'Test123!@#',
          email: `test_${timestamp}@example.com`,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeAll(async () => {
      // Create a test user for login tests
      const timestamp = Date.now();
      const testUser = {
        account: `logintest_${timestamp}`,
        password: 'Test123!@#',
        email: `logintest_${timestamp}@example.com`,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      testUserId = response.body.data.id;
    });

    it('should login successfully with account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: `logintest_${testUserId}`,
          password: 'Test123!@#',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).not.toHaveProperty('password');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: `logintest_${testUserId}`,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent account', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'nonexistent_user_12345',
          password: 'Test123!@#',
        })
        .expect(401);
    });

    it('should fail with missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: `logintest_${testUserId}`,
        })
        .expect(400);
    });

    it('should fail with missing account', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'Test123!@#',
        })
        .expect(400);
    });

    it('should fail with empty credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid_token_123',
        })
        .expect(401);
    });

    it('should fail with missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should fail with expired refresh token', async () => {
      // This would require mocking time or using an expired token
      // Skipping for now as it requires more complex setup
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('should fail without access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should fail with invalid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    beforeAll(async () => {
      // Login again to get fresh token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: `logintest_${testUserId}`,
          password: 'Test123!@#',
        })
        .expect(201);

      accessToken = response.body.data.accessToken;
    });

    it('should get current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('account');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without access token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail with invalid access token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);
    });

    it('should fail with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Session Management', () => {
    it('should create session on login', async () => {
      const timestamp = Date.now();
      const user = {
        account: `session_test_${timestamp}`,
        password: 'Test123!@#',
        email: `session_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      const userId = registerResponse.body.data.id;

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      const sessions = await (dbClient as any).sessions.findMany({
        where: { user_id: userId },
      });

      expect(sessions.length).toBeGreaterThan(0);

      // Cleanup
      await (dbClient as any).sessions.deleteMany({ where: { user_id: userId } });
      await dbClient.users.delete({ where: { id: userId } });
    });

    it('should remove session on logout', async () => {
      const timestamp = Date.now();
      const user = {
        account: `logout_test_${timestamp}`,
        password: 'Test123!@#',
        email: `logout_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      const userId = registerResponse.body.data.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      const token = loginResponse.body.data.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const sessions = await (dbClient as any).sessions.findMany({
        where: { user_id: userId },
      });

      expect(sessions.length).toBe(0);

      // Cleanup
      await dbClient.users.delete({ where: { id: userId } });
    });

    it('should handle multiple concurrent sessions', async () => {
      const timestamp = Date.now();
      const user = {
        account: `multi_session_${timestamp}`,
        password: 'Test123!@#',
        email: `multi_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      const userId = registerResponse.body.data.id;

      // Login from multiple devices
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      const sessions = await (dbClient as any).sessions.findMany({
        where: { user_id: userId },
      });

      expect(sessions.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await (dbClient as any).sessions.deleteMany({ where: { user_id: userId } });
      await dbClient.users.delete({ where: { id: userId } });
    });
  });

  describe('Security', () => {
    it('should not expose password in responses', async () => {
      const timestamp = Date.now();
      const user = {
        account: `security_test_${timestamp}`,
        password: 'Test123!@#',
        email: `security_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      expect(registerResponse.body.data).not.toHaveProperty('password');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      expect(loginResponse.body.data.user).not.toHaveProperty('password');

      const token = loginResponse.body.data.accessToken;

      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body.data).not.toHaveProperty('password');

      // Cleanup
      const userId = registerResponse.body.data.id;
      await (dbClient as any).sessions.deleteMany({ where: { user_id: userId } });
      await dbClient.users.delete({ where: { id: userId } });
    });

    it('should hash passwords in database', async () => {
      const timestamp = Date.now();
      const plainPassword = 'Test123!@#';
      const user = {
        account: `hash_test_${timestamp}`,
        password: plainPassword,
        email: `hash_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      const userId = registerResponse.body.data.id;

      const dbUser = await dbClient.users.findUnique({
        where: { id: userId },
      });

      expect(dbUser).toBeTruthy();
      expect(dbUser!.hash_password).not.toBe(plainPassword);
      expect(dbUser!.hash_password.length).toBeGreaterThan(20);

      // Cleanup
      await dbClient.users.delete({ where: { id: userId } });
    });

    it('should validate JWT token format', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });

    it('should reject tampered JWT tokens', async () => {
      const timestamp = Date.now();
      const user = {
        account: `tamper_test_${timestamp}`,
        password: 'Test123!@#',
        email: `tamper_${timestamp}@example.com`,
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: user.account,
          password: user.password,
        })
        .expect(201);

      const token = loginResponse.body.data.accessToken;
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      // Cleanup
      const userId = registerResponse.body.data.id;
      await (dbClient as any).sessions.deleteMany({ where: { user_id: userId } });
      await dbClient.users.delete({ where: { id: userId } });
    });
  });
});
