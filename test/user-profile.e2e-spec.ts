import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';

describe('User Profile (e2e)', () => {
  let app: INestApplication;
  let prisma: DbClient;
  let authToken: string;
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

    prisma = app.get<DbClient>(DbClient);
    await app.init();

    // Create test user and login
    const timestamp = Date.now();
    const testUser = {
      account: `testuser_profile_${timestamp}`,
      password: 'Test123!@#',
      email: `testprofile${timestamp}@test.com`,
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: testUser.account,
        password: testUser.password,
      })
      .expect(201);

    authToken = loginResponse.body.data.accessToken;
    userId = loginResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test user and related data
    if (userId) {
      await prisma.userProfile.deleteMany({
        where: { user_id: userId },
      });
      await prisma.learningHistory.deleteMany({
        where: { user_id: userId },
      });
      await prisma.users.delete({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('/user-profile (GET)', () => {
    it('should get user profile (auto-create if not exists)', () => {
      return request(app.getHttpServer())
        .get('/user-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('user_id', userId);
          expect(res.body.data).toHaveProperty('total_kanji', 0);
          expect(res.body.data).toHaveProperty('total_quiz', 0);
          expect(res.body.data).toHaveProperty('total_flashcard', 0);
          expect(res.body.data).toHaveProperty('total_points', 0);
          expect(res.body.data).toHaveProperty('current_streak', 0);
          expect(res.body.data).toHaveProperty('longest_streak', 0);
          expect(res.body.data).toHaveProperty('User');
          expect(res.body.data.User).toHaveProperty('account');
          expect(res.body.data.User).toHaveProperty('email');
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .get('/user-profile')
        .expect(401);
    });
  });

  describe('/user-profile (PUT)', () => {
    it('should update user profile', () => {
      const updateData = {
        display_name: 'Test User Display',
        bio: 'This is my test bio',
        location: 'Hanoi, Vietnam',
        website: 'https://example.com',
      };

      return request(app.getHttpServer())
        .put('/user-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('display_name', updateData.display_name);
          expect(res.body.data).toHaveProperty('bio', updateData.bio);
          expect(res.body.data).toHaveProperty('location', updateData.location);
          expect(res.body.data).toHaveProperty('website', updateData.website);
        });
    });

    it('should validate website URL format', () => {
      return request(app.getHttpServer())
        .put('/user-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          website: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .put('/user-profile')
        .send({ display_name: 'Test' })
        .expect(401);
    });
  });

  describe('/user-profile/history (GET)', () => {
    it('should get learning history', () => {
      return request(app.getHttpServer())
        .get('/user-profile/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should support limit and offset parameters', () => {
      return request(app.getHttpServer())
        .get('/user-profile/history?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .get('/user-profile/history')
        .expect(401);
    });
  });

  describe('/user-profile/leaderboard (GET)', () => {
    it('should get leaderboard', () => {
      return request(app.getHttpServer())
        .get('/user-profile/leaderboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          if (res.body.data.length > 0) {
            expect(res.body.data[0]).toHaveProperty('total_points');
            expect(res.body.data[0]).toHaveProperty('User');
          }
        });
    });

    it('should support limit parameter', () => {
      return request(app.getHttpServer())
        .get('/user-profile/leaderboard?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('should allow access without auth token (public)', () => {
      return request(app.getHttpServer())
        .get('/user-profile/leaderboard')
        .expect(200);
    });
  });

  describe('Profile Stats and Streak', () => {
    it('should have correct initial stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/user-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.total_kanji).toBe(0);
      expect(response.body.data.total_quiz).toBe(0);
      expect(response.body.data.total_flashcard).toBe(0);
      expect(response.body.data.total_points).toBe(0);
      expect(response.body.data.current_streak).toBe(0);
      expect(response.body.data.longest_streak).toBe(0);
    });
  });
});
