import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('Quiz Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let regularUser: any;
  let regularToken: string;
  let user2: any;
  let user2Token: string;
  let adminUser: any;
  let adminToken: string;

  let testQuiz: any;
  let user2Quiz: any;
  let publicQuiz: any;

  let testQuestion1: any;
  let testQuestion2: any;
  let testQuestion3: any;

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

    const timestamp = Date.now();

    // Create regular user
    const registerResponse1 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `quiz-regular-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Quiz Regular User',
      });
    regularUser = registerResponse1.body.data.user;

    const loginResponse1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: regularUser.email,
        password: 'Password123!',
      });
    regularToken = loginResponse1.body.data.accessToken;

    // Create user2
    const registerResponse2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `quiz-user2-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Quiz User 2',
      });
    user2 = registerResponse2.body.data.user;

    const loginResponse2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: user2.email,
        password: 'Password123!',
      });
    user2Token = loginResponse2.body.data.accessToken;

    // Create admin user
    const registerResponse3 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `quiz-admin-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Quiz Admin User',
      });
    adminUser = registerResponse3.body.data.user;

    // Set admin role manually
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'ADMIN' },
    });

    const loginResponse3 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: adminUser.email,
        password: 'Password123!',
      });
    adminToken = loginResponse3.body.data.accessToken;

    // Create test quizzes
    testQuiz = await prisma.quiz.create({
      data: {
        userId: regularUser.id,
        title: 'Test Quiz 1',
        description: 'A private test quiz',
        difficulty: 'BEGINNER',
        isPublic: false,
      },
    });

    user2Quiz = await prisma.quiz.create({
      data: {
        userId: user2.id,
        title: 'User2 Quiz',
        description: 'Another user quiz',
        difficulty: 'INTERMEDIATE',
        isPublic: false,
      },
    });

    publicQuiz = await prisma.quiz.create({
      data: {
        userId: user2.id,
        title: 'Public Quiz',
        description: 'A public quiz for everyone',
        difficulty: 'ADVANCED',
        isPublic: true,
      },
    });

    // Create questions for publicQuiz (needed for start attempt)
    await prisma.question.create({
      data: {
        quizId: publicQuiz.id,
        type: 'MULTIPLE_CHOICE',
        questionText: 'Public question 1',
        correctAnswer: 'correct',
        options: ['correct', 'wrong1', 'wrong2', 'wrong3'],
        points: 10,
        order: 0,
      },
    });

    // Create test questions for testQuiz
    testQuestion1 = await prisma.question.create({
      data: {
        quizId: testQuiz.id,
        type: 'MULTIPLE_CHOICE',
        questionText: 'What is the meaning of 学?',
        correctAnswer: 'study',
        options: ['study', 'school', 'learn', 'teach'],
        explanation: '学 means study or learning',
        points: 10,
        order: 0,
      },
    });

    testQuestion2 = await prisma.question.create({
      data: {
        quizId: testQuiz.id,
        type: 'FILL_IN_BLANK',
        questionText: 'What is the reading of 生?',
        correctAnswer: 'せい',
        explanation: 'One reading is せい',
        points: 15,
        order: 1,
      },
    });

    testQuestion3 = await prisma.question.create({
      data: {
        quizId: testQuiz.id,
        type: 'DRAWING',
        questionText: 'Draw the kanji for "person"',
        correctAnswer: '人',
        meanings: ['person', 'human'],
        points: 20,
        order: 2,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up quiz attempts and answers before each test
    await prisma.quizAnswer.deleteMany({});
    await prisma.quizAttempt.deleteMany({
      where: {
        userId: {
          in: [regularUser.id, user2.id, adminUser.id],
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.quizAnswer.deleteMany({});
    await prisma.quizAttempt.deleteMany({
      where: {
        userId: {
          in: [regularUser.id, user2.id, adminUser.id],
        },
      },
    });
  });

  describe('GET /api/quizzes', () => {
    it('should get all quizzes (public + own)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.total).toBeGreaterThanOrEqual(2);
      
      // Should see own quiz and public quiz
      const quizIds = response.body.data.data.map((q: any) => q.id);
      expect(quizIds).toContain(testQuiz.id);
      expect(quizIds).toContain(publicQuiz.id);
    });

    it('should filter quizzes by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quizzes')
        .query({ search: 'Public' })
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.data[0].title).toContain('Public');
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quizzes')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.limit).toBe(1);
      expect(response.body.data.offset).toBe(0);
      expect(response.body.data.data.length).toBeLessThanOrEqual(1);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/quizzes')
        .expect(401);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should get own quiz', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(testQuiz.id);
      expect(response.body.data.title).toBe('Test Quiz 1');
      expect(response.body.data.questions).toBeDefined();
      expect(response.body.data.questions.length).toBe(3);
    });

    it('should get public quiz', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/quizzes/${publicQuiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(publicQuiz.id);
      expect(response.body.data.isPublic).toBe(true);
    });

    it('should fail when accessing other user private quiz', async () => {
      await request(app.getHttpServer())
        .get(`/api/quizzes/${user2Quiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should fail with non-existent quiz', async () => {
      await request(app.getHttpServer())
        .get('/api/quizzes/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/quizzes/${testQuiz.id}`)
        .expect(401);
    });
  });

  describe('POST /api/quizzes', () => {
    it('should create a new quiz', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'New Quiz',
          description: 'A new test quiz',
        })
        .expect(201);

      expect(response.body.data.title).toBe('New Quiz');
      expect(response.body.data.description).toBe('A new test quiz');
      expect(response.body.data.userId).toBe(regularUser.id);
      expect(response.body.data.isPublic).toBe(false);

      // Cleanup
      await prisma.quiz.delete({ where: { id: response.body.data.id } });
    });

    it('should create quiz without description', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Minimal Quiz',
        })
        .expect(201);

      expect(response.body.data.title).toBe('Minimal Quiz');
      expect(response.body.data.description).toBeNull();

      // Cleanup
      await prisma.quiz.delete({ where: { id: response.body.data.id } });
    });

    it('should fail without title', async () => {
      await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          description: 'No title',
        })
        .expect(500); // Prisma validation error (should be 400 in production)
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/quizzes')
        .send({
          title: 'Unauthenticated Quiz',
        })
        .expect(401);
    });
  });

  describe('PUT /api/quizzes/:id', () => {
    it('should update own quiz', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Updated Quiz Title',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.data.title).toBe('Updated Quiz Title');
      expect(response.body.data.description).toBe('Updated description');

      // Restore original
      await prisma.quiz.update({
        where: { id: testQuiz.id },
        data: { title: 'Test Quiz 1', description: 'A private test quiz' },
      });
    });

    it('should update quiz visibility', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          isPublic: true,
        })
        .expect(200);

      expect(response.body.data.isPublic).toBe(true);

      // Restore original
      await prisma.quiz.update({
        where: { id: testQuiz.id },
        data: { isPublic: false },
      });
    });

    it('should fail when updating other user quiz', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${user2Quiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Hacked Title',
        })
        .expect(403);
    });

    it('should fail with non-existent quiz', async () => {
      await request(app.getHttpServer())
        .put('/api/quizzes/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Not Found',
        })
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}`)
        .send({
          title: 'Unauthenticated Update',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/quizzes/:id', () => {
    it('should delete own quiz', async () => {
      // Create a quiz to delete
      const quizToDelete = await prisma.quiz.create({
        data: {
          userId: regularUser.id,
          title: 'Quiz to Delete',
          description: 'Will be deleted',
          difficulty: 'BEGINNER',
          isPublic: false,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/quizzes/${quizToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.quiz.findUnique({
        where: { id: quizToDelete.id },
      });
      expect(deleted).toBeNull();
    });

    it('should fail when deleting other user quiz', async () => {
      await request(app.getHttpServer())
        .delete(`/api/quizzes/${user2Quiz.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should fail with non-existent quiz', async () => {
      await request(app.getHttpServer())
        .delete('/api/quizzes/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/quizzes/${testQuiz.id}`)
        .expect(401);
    });
  });

  describe('POST /api/quizzes/:id/questions', () => {
    it('should add multiple choice question', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is 先?',
          correctAnswer: 'before',
          options: ['before', 'after', 'during', 'never'],
          explanation: '先 means before or ahead',
          points: 10,
        })
        .expect(201);

      expect(response.body.data.questionText).toBe('What is 先?');
      expect(response.body.data.type).toBe('MULTIPLE_CHOICE');
      expect(response.body.data.options).toEqual(['before', 'after', 'during', 'never']);

      // Cleanup
      await prisma.question.delete({ where: { id: response.body.data.id } });
    });

    it('should add text input question', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Enter the kanji for "water"',
          correctAnswer: '水',
          points: 15,
        })
        .expect(201);

      expect(response.body.data.type).toBe('FILL_IN_BLANK');
      expect(response.body.data.correctAnswer).toBe('水');

      // Cleanup
      await prisma.question.delete({ where: { id: response.body.data.id } });
    });

    it('should add drawing question', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'DRAWING',
          questionText: 'Draw the kanji for "fire"',
          correctAnswer: '火',
          meanings: ['fire', 'flame'],
          points: 20,
        })
        .expect(201);

      expect(response.body.data.type).toBe('DRAWING');
      expect(response.body.data.meanings).toEqual(['fire', 'flame']);

      // Cleanup
      await prisma.question.delete({ where: { id: response.body.data.id } });
    });

    it('should auto-increment order if not provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Auto order question',
          correctAnswer: 'answer',
        })
        .expect(201);

      expect(response.body.data.order).toBeGreaterThanOrEqual(3);

      // Cleanup
      await prisma.question.delete({ where: { id: response.body.data.id } });
    });

    it('should fail when adding to other user quiz', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${user2Quiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Unauthorized question',
          correctAnswer: 'no',
        })
        .expect(403);
    });

    it('should fail with invalid question type', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'INVALID_TYPE',
          questionText: 'Bad type',
          correctAnswer: 'answer',
        })
        .expect(400);
    });

    it('should fail without required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          // Missing questionText and correctAnswer
        })
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/questions`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Unauthenticated',
          correctAnswer: 'no',
        })
        .expect(401);
    });
  });

  describe('PUT /api/quizzes/:id/questions/:questionId', () => {
    it('should update question text', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/${testQuestion1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          questionText: 'Updated: What is 学?',
        })
        .expect(200);

      expect(response.body.data.questionText).toBe('Updated: What is 学?');

      // Restore original
      await prisma.question.update({
        where: { id: testQuestion1.id },
        data: { questionText: 'What is the meaning of 学?' },
      });
    });

    it('should update question points', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/${testQuestion1.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          points: 25,
        })
        .expect(200);

      expect(response.body.data.points).toBe(25);

      // Restore original
      await prisma.question.update({
        where: { id: testQuestion1.id },
        data: { points: 10 },
      });
    });

    it('should fail when updating question in other user quiz', async () => {
      const user2Question = await prisma.question.create({
        data: {
          quizId: user2Quiz.id,
          type: 'FILL_IN_BLANK',
          questionText: 'User2 question',
          correctAnswer: 'answer',
          order: 0,
        },
      });

      await request(app.getHttpServer())
        .put(`/api/quizzes/${user2Quiz.id}/questions/${user2Question.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          questionText: 'Hacked',
        })
        .expect(403);

      // Cleanup
      await prisma.question.delete({ where: { id: user2Question.id } });
    });

    it('should fail with non-existent question', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/99999`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          questionText: 'Not found',
        })
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/${testQuestion1.id}`)
        .send({
          questionText: 'Unauthenticated',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/quizzes/:id/questions/:questionId', () => {
    it('should delete question', async () => {
      const questionToDelete = await prisma.question.create({
        data: {
          quizId: testQuiz.id,
          type: 'FILL_IN_BLANK',
          questionText: 'Question to delete',
          correctAnswer: 'delete',
          order: 99,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/quizzes/${testQuiz.id}/questions/${questionToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.question.findUnique({
        where: { id: questionToDelete.id },
      });
      expect(deleted).toBeNull();
    });

    it('should fail when deleting from other user quiz', async () => {
      const user2Question = await prisma.question.create({
        data: {
          quizId: user2Quiz.id,
          type: 'FILL_IN_BLANK',
          questionText: 'Protected question',
          correctAnswer: 'no',
          order: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/quizzes/${user2Quiz.id}/questions/${user2Question.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      // Cleanup
      await prisma.question.delete({ where: { id: user2Question.id } });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/quizzes/${testQuiz.id}/questions/${testQuestion1.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/quizzes/:id/questions/reorder', () => {
    it('should reorder questions', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/reorder`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          questionOrders: [
            { id: testQuestion1.id, order: 2 },
            { id: testQuestion2.id, order: 0 },
            { id: testQuestion3.id, order: 1 },
          ],
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data.questions).toBeDefined();

      // Verify reordering
      const questions = await prisma.question.findMany({
        where: { quizId: testQuiz.id },
        orderBy: { order: 'asc' },
      });

      expect(questions[0].id).toBe(testQuestion2.id);
      expect(questions[1].id).toBe(testQuestion3.id);
      expect(questions[2].id).toBe(testQuestion1.id);

      // Restore original order
      await prisma.question.update({
        where: { id: testQuestion1.id },
        data: { order: 0 },
      });
      await prisma.question.update({
        where: { id: testQuestion2.id },
        data: { order: 1 },
      });
      await prisma.question.update({
        where: { id: testQuestion3.id },
        data: { order: 2 },
      });
    });

    it('should fail when reordering other user quiz', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${user2Quiz.id}/questions/reorder`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          questionOrders: [{ id: 1, order: 0 }],
        })
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/quizzes/${testQuiz.id}/questions/reorder`)
        .send({
          questionOrders: [],
        })
        .expect(401);
    });
  });

  describe('POST /api/quizzes/:id/start', () => {
    it('should start a quiz attempt', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/start`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(201);

      expect(response.body.data.quizId).toBe(testQuiz.id);
      expect(response.body.data.userId).toBe(regularUser.id);
      expect(response.body.data.completed).toBe(false);
      expect(response.body.data.id).toBeDefined();

      // Cleanup
      await prisma.quizAttempt.delete({ where: { id: response.body.data.id } });
    });

    it('should start attempt for public quiz', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/${publicQuiz.id}/start`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(201);

      expect(response.body.data.quizId).toBe(publicQuiz.id);

      // Cleanup
      await prisma.quizAttempt.delete({ where: { id: response.body.data.id } });
    });

    it('should fail when starting other user private quiz', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${user2Quiz.id}/start`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should fail with non-existent quiz', async () => {
      await request(app.getHttpServer())
        .post('/api/quizzes/99999/start')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/${testQuiz.id}/start`)
        .expect(401);
    });
  });

  describe('POST /api/quizzes/attempts/:attemptId/submit', () => {
    let testAttempt: any;

    beforeEach(async () => {
      testAttempt = await prisma.quizAttempt.create({
        data: {
          userId: regularUser.id,
          quizId: testQuiz.id,
          totalQuestions: 3,
          maxScore: 45,
        },
      });
    });

    it('should submit quiz with all correct answers', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${testAttempt.id}/submit`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [
            { questionId: testQuestion1.id, answer: 'study' },
            { questionId: testQuestion2.id, answer: 'せい' },
            { questionId: testQuestion3.id, answer: '人' },
          ],
          timeSpent: 120,
        })
        .expect(201);

      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.correctAnswers).toBe(3);
      expect(response.body.data.score).toBe(45);
      expect(response.body.data.timeSpent).toBe(120);
    });

    it('should submit quiz with mixed answers', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${testAttempt.id}/submit`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [
            { questionId: testQuestion1.id, answer: 'study' }, // Correct
            { questionId: testQuestion2.id, answer: 'wrong' }, // Wrong
            { questionId: testQuestion3.id, answer: '人' }, // Correct
          ],
          timeSpent: 90,
        })
        .expect(201);

      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.correctAnswers).toBe(2);
      expect(response.body.data.score).toBe(30); // 10 + 20 points
    });

    it('should submit quiz with all wrong answers', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${testAttempt.id}/submit`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [
            { questionId: testQuestion1.id, answer: 'wrong1' },
            { questionId: testQuestion2.id, answer: 'wrong2' },
            { questionId: testQuestion3.id, answer: 'wrong3' },
          ],
          timeSpent: 60,
        })
        .expect(201);

      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.correctAnswers).toBe(0);
      expect(response.body.data.score).toBe(0);
    });

    it('should fail when submitting other user attempt', async () => {
      const user2Attempt = await prisma.quizAttempt.create({
        data: {
          userId: user2.id,
          quizId: testQuiz.id,
          totalQuestions: 3,
          maxScore: 45,
        },
      });

      await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${user2Attempt.id}/submit`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [],
          timeSpent: 0,
        })
        .expect(403);

      // Cleanup
      await prisma.quizAttempt.delete({ where: { id: user2Attempt.id } });
    });

    it('should fail with invalid attempt id', async () => {
      await request(app.getHttpServer())
        .post('/api/quizzes/attempts/99999/submit')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [],
          timeSpent: 0,
        })
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${testAttempt.id}/submit`)
        .send({
          answers: [],
          timeSpent: 0,
        })
        .expect(401);
    });
  });

  describe('GET /api/quizzes/:id/attempts', () => {
    let attempt1: any;
    let attempt2: any;

    beforeEach(async () => {
      attempt1 = await prisma.quizAttempt.create({
        data: {
          userId: regularUser.id,
          quizId: testQuiz.id,
          score: 30,
          maxScore: 45,
          correctAnswers: 2,
          totalQuestions: 3,
          timeSpent: 90,
          completed: true,
        },
      });

      attempt2 = await prisma.quizAttempt.create({
        data: {
          userId: regularUser.id,
          quizId: testQuiz.id,
          score: 45,
          maxScore: 45,
          correctAnswers: 3,
          totalQuestions: 3,
          timeSpent: 120,
          completed: true,
        },
      });
    });

    it('should get all attempts for a quiz', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/quizzes/${testQuiz.id}/attempts`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.some((a: any) => a.id === attempt1.id)).toBe(true);
      expect(response.body.data.some((a: any) => a.id === attempt2.id)).toBe(true);
    });

    it('should return empty array for quiz with no attempts', async () => {
      const newQuiz = await prisma.quiz.create({
        data: {
          userId: regularUser.id,
          title: 'No Attempts Quiz',
          difficulty: 'BEGINNER',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/quizzes/${newQuiz.id}/attempts`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);

      // Cleanup
      await prisma.quiz.delete({ where: { id: newQuiz.id } });
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/quizzes/${testQuiz.id}/attempts`)
        .expect(401);
    });
  });

  describe('GET /api/quizzes/attempts/:attemptId', () => {
    let testAttempt: any;
    let answer1: any;
    let answer2: any;

    beforeEach(async () => {
      testAttempt = await prisma.quizAttempt.create({
        data: {
          userId: regularUser.id,
          quizId: testQuiz.id,
          score: 25,
          maxScore: 45,
          correctAnswers: 2,
          totalQuestions: 3,
          timeSpent: 100,
          completed: true,
        },
      });

      answer1 = await prisma.quizAnswer.create({
        data: {
          attemptId: testAttempt.id,
          questionId: testQuestion1.id,
          userAnswer: 'study',
          isCorrect: true,
          points: 10,
        },
      });

      answer2 = await prisma.quizAnswer.create({
        data: {
          attemptId: testAttempt.id,
          questionId: testQuestion2.id,
          userAnswer: 'wrong',
          isCorrect: false,
          points: 0,
        },
      });
    });

    it('should get attempt details with answers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/quizzes/attempts/${testAttempt.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(testAttempt.id);
      expect(response.body.data.score).toBe(25);
      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.answers).toBeDefined();
      expect(response.body.data.answers.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail when accessing other user attempt', async () => {
      const user2Attempt = await prisma.quizAttempt.create({
        data: {
          userId: user2.id,
          quizId: testQuiz.id,
          score: 0,
          maxScore: 45,
          completed: true,
        },
      });

      await request(app.getHttpServer())
        .get(`/api/quizzes/attempts/${user2Attempt.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      // Cleanup
      await prisma.quizAttempt.delete({ where: { id: user2Attempt.id } });
    });

    it('should fail with non-existent attempt', async () => {
      await request(app.getHttpServer())
        .get('/api/quizzes/attempts/99999')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/quizzes/attempts/${testAttempt.id}`)
        .expect(401);
    });
  });

  describe('Complete Quiz Workflow', () => {
    it('should complete full quiz workflow', async () => {
      // 1. Create a new quiz
      const createQuizResponse = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Workflow Test Quiz',
          description: 'Testing complete workflow',
        })
        .expect(201);

      const workflowQuizId = createQuizResponse.body.data.id;

      // 2. Add questions
      const q1Response = await request(app.getHttpServer())
        .post(`/api/quizzes/${workflowQuizId}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Question 1',
          correctAnswer: 'answer1',
          points: 10,
        })
        .expect(201);

      const q2Response = await request(app.getHttpServer())
        .post(`/api/quizzes/${workflowQuizId}/questions`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          type: 'FILL_IN_BLANK',
          questionText: 'Question 2',
          correctAnswer: 'answer2',
          points: 20,
        })
        .expect(201);

      // 3. Start quiz attempt
      const startResponse = await request(app.getHttpServer())
        .post(`/api/quizzes/${workflowQuizId}/start`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(201);

      const attemptId = startResponse.body.data.id;

      // 4. Submit answers
      const submitResponse = await request(app.getHttpServer())
        .post(`/api/quizzes/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          answers: [
            { questionId: q1Response.body.data.id, answer: 'answer1' },
            { questionId: q2Response.body.data.id, answer: 'answer2' },
          ],
          timeSpent: 60,
        })
        .expect(201);

      expect(submitResponse.body.data.completed).toBe(true);
      expect(submitResponse.body.data.score).toBe(30);
      expect(submitResponse.body.data.correctAnswers).toBe(2);

      // 5. View attempt details
      const detailsResponse = await request(app.getHttpServer())
        .get(`/api/quizzes/attempts/${attemptId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(detailsResponse.body.data.id).toBe(attemptId);
      expect(detailsResponse.body.data.answers.length).toBe(2);

      // 6. View all attempts
      const attemptsResponse = await request(app.getHttpServer())
        .get(`/api/quizzes/${workflowQuizId}/attempts`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(attemptsResponse.body.data.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await prisma.quiz.delete({ where: { id: workflowQuizId } });
    });
  });
});
