import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Change Password (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register a test user
    const uniqueId = Date.now();
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        account: `testuser_${uniqueId}`,
        email: `testuser_${uniqueId}@test.com`,
        password: 'password123',
      });

    console.log('Register response:', registerResponse.body);
    const registerData = registerResponse.body.data || registerResponse.body;
    testUserId = registerData.id;

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: `testuser_${uniqueId}`,
        password: 'password123',
      });

    console.log('Login response:', loginResponse.body);
    const loginData = loginResponse.body.data || loginResponse.body;
    accessToken = loginData.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /user-profile/change-password', () => {
    it('should change password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456',
          confirmPassword: 'newpassword456',
        })
        .expect(201);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('thành công');
    });

    it('should fail with wrong current password', async () => {
      await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword789',
          confirmPassword: 'newpassword789',
        })
        .expect(401);
    });

    it('should fail when new password and confirm password do not match', async () => {
      await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'newpassword456',
          newPassword: 'newpassword789',
          confirmPassword: 'differentpassword',
        })
        .expect(400);
    });

    it('should fail when new password is too short', async () => {
      await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'newpassword456',
          newPassword: '12345',
          confirmPassword: '12345',
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456',
          confirmPassword: 'newpassword456',
        })
        .expect(401);
    });

    it('should be able to login with new password', async () => {
      // Get account name from previous registration
      const uniqueId = Date.now();
      const testAccount = `testuser_changepass_${uniqueId}`;
      
      // Register new user for this test
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          account: testAccount,
          email: `${testAccount}@test.com`,
          password: 'password123',
        });

      // Login to get token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testAccount,
          password: 'password123',
        });

      const loginData = loginRes.body.data || loginRes.body;
      const newAccessToken = loginData.accessToken;

      // Change password
      await request(app.getHttpServer())
        .post('/user-profile/change-password')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'finalpassword999',
          confirmPassword: 'finalpassword999',
        })
        .expect(201);

      // Try to login with old password (should fail)
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testAccount,
          password: 'password123',
        })
        .expect(401);

      // Try to login with new password (should succeed)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testAccount,
          password: 'finalpassword999',
        })
        .expect(201);

      const finalLoginData = loginResponse.body.data || loginResponse.body;
      expect(finalLoginData).toHaveProperty('accessToken');
      expect(finalLoginData).toHaveProperty('user');
    });
  });
});
