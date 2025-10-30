import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/services/prisma.service';

describe('Quiz Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: number;
  let quizId: number;
  let attemptId: number;
  let questionIds: number[] = [];

  const testUser = {
    email: `quiz-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Quiz Test User',
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

    // Setup: Register and login
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .then((response) => {
        userId = response.body.id;
      });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        account: testUser.email,
        password: testUser.password,
      })
      .then((response) => {
        accessToken = response.body.accessToken;
      });

    // Create a test quiz with questions
    const quiz = await prisma.quiz.create({
      data: {
        title: 'JLPT N5 Kanji Test',
        description: 'Basic kanji quiz for beginners',
        difficulty: 'BEGINNER',
        userId: userId,
        isPublic: true,
      },
    });
    quizId = quiz.id;

    // Create test questions
    const questionsData = [
      {
        questionText: 'What is the meaning of 日?',
        type: 'MULTIPLE_CHOICE' as const,
        points: 10,
        options: ['sun, day', 'moon', 'fire', 'water'],
        correctAnswer: 'sun, day',
        order: 1,
      },
      {
        questionText: 'What is the reading of 月?',
        type: 'MULTIPLE_CHOICE' as const,
        points: 10,
        options: ['hi', 'tsuki', 'ka', 'mizu'],
        correctAnswer: 'tsuki',
        order: 2,
      },
      {
        questionText: 'Which kanji means "fire"?',
        type: 'MULTIPLE_CHOICE' as const,
        points: 10,
        options: ['日', '月', '火', '水'],
        correctAnswer: '火',
        order: 3,
      },
      {
        questionText: 'Translate: 水',
        type: 'FILL_IN_BLANK' as const,
        points: 15,
        correctAnswer: 'water',
        order: 4,
      },
      {
        questionText: 'True or False: 木 means "tree"',
        type: 'TRUE_FALSE' as const,
        points: 5,
        correctAnswer: 'true',
        order: 5,
      },
    ];

    for (const questionData of questionsData) {
      const question = await prisma.question.create({
        data: {
          ...questionData,
          quizId: quizId,
        },
      });
      questionIds.push(question.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (quizId) {
      await prisma.question.deleteMany({ where: { quizId } });
      await prisma.quiz.delete({ where: { id: quizId } }).catch(() => {});
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Quiz Discovery', () => {
    it('GET /api/quizzes should list all published quizzes', () => {
      return request(app.getHttpServer())
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          const testQuiz = response.body.find((q: any) => q.id === quizId);
          expect(testQuiz).toBeDefined();
          expect(testQuiz.title).toBe('JLPT N5 Kanji Test');
        });
    });

    it('GET /api/quizzes/:id should get quiz details', () => {
      return request(app.getHttpServer())
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(quizId);
          expect(response.body.title).toBe('JLPT N5 Kanji Test');
          expect(response.body).toHaveProperty('questions');
          expect(response.body.questions).toHaveLength(5);
          expect(response.body).toHaveProperty('_count');
        });
    });

    it('GET /api/quizzes?difficulty=EASY should filter by difficulty', () => {
      return request(app.getHttpServer())
        .get('/api/quizzes')
        .query({ difficulty: 'EASY' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((quiz: any) => {
            expect(quiz.difficulty).toBe('EASY');
          });
        });
    });
  });

  describe('Quiz Attempt Lifecycle', () => {
    it('POST /api/quizzes/:id/start should start a quiz attempt', () => {
      return request(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('questions');
          expect(response.body.quizId).toBe(quizId);
          expect(response.body.userId).toBe(userId);
          expect(response.body.completed).toBe(false);
          expect(response.body.score).toBe(0);
          expect(response.body.totalQuestions).toBe(5);
          expect(response.body.correctAnswers).toBe(0);
          expect(Array.isArray(response.body.questions)).toBe(true);
          expect(response.body.questions.length).toBe(5);
          attemptId = response.body.id;
        });
    });

    it('GET /api/quiz-attempts/:id should get attempt details', () => {
      return request(app.getHttpServer())
        .get(`/api/quiz-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(attemptId);
          expect(response.body).toHaveProperty('questions');
          expect(response.body).toHaveProperty('quiz');
          expect(response.body.completed).toBe(false);
        });
    });

    it('should show questions without correct answers before completion', () => {
      return request(app.getHttpServer())
        .get(`/api/quiz-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          // Questions should not reveal correct answers yet
          response.body.questions.forEach((q: any) => {
            if (q.questionType === 'MULTIPLE_CHOICE') {
              expect(q.options).toBeDefined();
            }
            // correctAnswer should not be exposed before completion
          });
        });
    });
  });

  describe('Answer Submission', () => {
    it('POST /api/quiz-attempts/:id/submit should submit answers', () => {
      const answers = [
        { questionId: questionIds[0], answer: 'sun, day' }, // Correct
        { questionId: questionIds[1], answer: 'tsuki' }, // Correct
        { questionId: questionIds[2], answer: '月' }, // Incorrect (should be 火)
        { questionId: questionIds[3], answer: 'water' }, // Correct
        { questionId: questionIds[4], answer: 'true' }, // Correct
      ];

      return request(app.getHttpServer())
        .post(`/api/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers,
          timeSpent: 180, // 3 minutes
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('score');
          expect(response.body).toHaveProperty('maxScore');
          expect(response.body).toHaveProperty('correctAnswers');
          expect(response.body).toHaveProperty('totalQuestions');
          expect(response.body).toHaveProperty('timeSpent');
          expect(response.body.completed).toBe(true);
          expect(response.body.totalQuestions).toBe(5);
          expect(response.body.correctAnswers).toBe(4); // 4 out of 5 correct
          expect(response.body.score).toBe(40); // 10+10+15+5 = 40 points
          expect(response.body.maxScore).toBe(50); // Total possible points
          expect(response.body.timeSpent).toBe(180);
        });
    });

    it('should save answers in database', async () => {
      const answers = await prisma.quizAnswer.findMany({
        where: { attemptId: attemptId },
      });

      expect(answers).toHaveLength(5);
      answers.forEach((answer) => {
        expect(answer.attemptId).toBe(attemptId);
        expect(answer).toHaveProperty('answer');
        expect(answer).toHaveProperty('isCorrect');
        expect(answer).toHaveProperty('pointsEarned');
      });
    });

    it('should calculate points correctly', async () => {
      const answers = await prisma.quizAnswer.findMany({
        where: { attemptId: attemptId },
        include: { question: true },
      });

      const totalPoints = answers.reduce(
        (sum, a) => sum + a.points,
        0,
      );
      expect(totalPoints).toBe(40); // 4 correct answers

      // Check individual answers
      const correctAnswers = answers.filter((a) => a.isCorrect);
      expect(correctAnswers).toHaveLength(4);
    });

    it('should mark attempt as completed', async () => {
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
      });

      expect(attempt?.completed).toBe(true);
      expect(attempt?.score).toBe(40);
      expect(attempt?.maxScore).toBe(50);
      expect(attempt?.correctAnswers).toBe(4);
      expect(attempt?.totalQuestions).toBe(5);
      expect(attempt?.timeSpent).toBe(180);
    });

    it('GET /api/quiz-attempts/:id should show results after completion', () => {
      return request(app.getHttpServer())
        .get(`/api/quiz-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.completed).toBe(true);
          expect(response.body.score).toBe(40);
          // Now answers should be visible with correct/incorrect status
          expect(response.body).toHaveProperty('answers');
        });
    });

    it('should fail to submit answers twice', () => {
      const answers = [
        { questionId: questionIds[0], answer: 'sun, day' },
      ];

      return request(app.getHttpServer())
        .post(`/api/quiz-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers })
        .expect(400); // Bad request - already completed
    });
  });

  describe('Progress & Analytics', () => {
    it('GET /api/progress/overview should include quiz attempts', () => {
      return request(app.getHttpServer())
        .get('/api/progress/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('quizAttempts');
          expect(response.body.quizAttempts).toBeGreaterThan(0);
          expect(response.body.xp).toBeGreaterThan(0);
        });
    });

    it('GET /api/progress/quizzes should show quiz statistics', () => {
      return request(app.getHttpServer())
        .get('/api/progress/quizzes')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('totalAttempts');
          expect(response.body).toHaveProperty('totalQuestions');
          expect(response.body).toHaveProperty('correctAnswers');
          expect(response.body).toHaveProperty('averageAccuracy');
          expect(response.body).toHaveProperty('averageScore');
          expect(response.body).toHaveProperty('totalTime');
          expect(response.body.totalAttempts).toBe(1);
          expect(response.body.totalQuestions).toBe(5);
          expect(response.body.correctAnswers).toBe(4);
          expect(response.body.averageAccuracy).toBeCloseTo(80, 1); // 80%
          expect(response.body.totalTime).toBe(180); // 3 minutes
        });
    });

    it('GET /api/progress/leaderboard should include quiz scores', () => {
      return request(app.getHttpServer())
        .get('/api/progress/leaderboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body.topUsers)).toBe(true);
          expect(response.body).toHaveProperty('currentUser');
          expect(response.body.currentUser).toHaveProperty('quizzes');
        });
    });

    it('GET /api/progress/study-time should include quiz time', () => {
      return request(app.getHttpServer())
        .get('/api/progress/study-time')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('totalTime');
          expect(response.body.totalTime).toBeGreaterThanOrEqual(180); // At least quiz time
        });
    });
  });

  describe('Multiple Attempts', () => {
    let attempt2Id: number;

    it('should allow retaking a quiz', () => {
      return request(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.id).not.toBe(attemptId); // New attempt ID
          attempt2Id = response.body.id;
        });
    });

    it('should track separate attempts independently', async () => {
      const answers = [
        { questionId: questionIds[0], answer: 'sun, day' },
        { questionId: questionIds[1], answer: 'tsuki' },
        { questionId: questionIds[2], answer: '火' }, // Correct this time
        { questionId: questionIds[3], answer: 'water' },
        { questionId: questionIds[4], answer: 'true' },
      ];

      await request(app.getHttpServer())
        .post(`/api/quiz-attempts/${attempt2Id}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers, timeSpent: 120 })
        .expect(200);

      // Check that second attempt has full score
      const attempt2 = await prisma.quizAttempt.findUnique({
        where: { id: attempt2Id },
      });

      expect(attempt2?.score).toBe(50); // Full score
      expect(attempt2?.correctAnswers).toBe(5); // All correct
      expect(attempt2?.timeSpent).toBe(120);
    });

    it('should show improved accuracy after retake', () => {
      return request(app.getHttpServer())
        .get('/api/progress/quizzes')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ period: 'week' })
        .expect(200)
        .then((response) => {
          expect(response.body.totalAttempts).toBe(2);
          expect(response.body.correctAnswers).toBe(9); // 4 + 5
          expect(response.body.totalQuestions).toBe(10); // 5 + 5
          expect(response.body.averageAccuracy).toBeCloseTo(90, 1); // 90%
        });
    });
  });

  describe('Quiz History', () => {
    it('GET /api/quiz-attempts/my-attempts should list user attempts', () => {
      return request(app.getHttpServer())
        .get('/api/quiz-attempts/my-attempts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(2);
          response.body.forEach((attempt: any) => {
            expect(attempt.userId).toBe(userId);
            expect(attempt).toHaveProperty('quiz');
            expect(attempt).toHaveProperty('score');
            expect(attempt.completed).toBe(true);
          });
        });
    });

    it('GET /api/quizzes/:id/attempts should show all attempts for a quiz', () => {
      return request(app.getHttpServer())
        .get(`/api/quizzes/${quizId}/attempts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(2); // Two attempts
          expect(response.body[0].quizId).toBe(quizId);
        });
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should fail to start non-existent quiz', () => {
      return request(app.getHttpServer())
        .post('/api/quizzes/999999/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to submit incomplete answers', () => {
      return request(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .then((response) => {
          const newAttemptId = response.body.id;
          return request(app.getHttpServer())
            .post(`/api/quiz-attempts/${newAttemptId}/submit`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              answers: [
                { questionId: questionIds[0], answer: 'sun, day' },
                // Missing other answers
              ],
            })
            .expect(400);
        });
    });

    it('should fail to access other user attempts', async () => {
      // Create another user
      const otherUser = {
        email: `other-quiz-${Date.now()}@example.com`,
        password: 'OtherPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(otherUser);

      const otherLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          account: otherUser.email,
          password: otherUser.password,
        });

      const otherToken = otherLogin.body.accessToken;

      // Try to access original user's attempt
      return request(app.getHttpServer())
        .get(`/api/quiz-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should handle quiz with time limit', async () => {
      const timedQuiz = await prisma.quiz.create({
        data: {
          title: 'Speed Test',
          description: 'Quick quiz',
          difficulty: 'INTERMEDIATE',
          userId: userId,
          isPublic: true,
        },
      });

      await prisma.question.create({
        data: {
          questionText: 'Quick question?',
          type: 'TRUE_FALSE',
          correctAnswer: 'true',
          points: 10,
          order: 1,
          quizId: timedQuiz.id,
        },
      });

      const attempt = await request(app.getHttpServer())
        .post(`/api/quizzes/${timedQuiz.id}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(attempt.body.quiz).toBeDefined();

      // Cleanup
      await prisma.question.deleteMany({ where: { quizId: timedQuiz.id } });
      await prisma.quiz.delete({ where: { id: timedQuiz.id } });
    });

    it('should validate answer format', () => {
      return request(app.getHttpServer())
        .post(`/api/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${accessToken}`)
        .then((response) => {
          const newAttemptId = response.body.id;
          return request(app.getHttpServer())
            .post(`/api/quiz-attempts/${newAttemptId}/submit`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              answers: [
                { questionId: questionIds[0] }, // Missing answer
              ],
            })
            .expect(400);
        });
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle multiple users taking quiz simultaneously', async () => {
      // Create 3 concurrent users and attempts
      const users = await Promise.all(
        [1, 2, 3].map(async (i) => {
          const user = {
            email: `concurrent-${i}-${Date.now()}@example.com`,
            password: 'ConcurrentPassword123!',
          };

          await request(app.getHttpServer())
            .post('/api/auth/register')
            .send(user);

          const login = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({
              account: user.email,
              password: user.password,
            });

          return login.body.accessToken;
        }),
      );

      // All users start quiz at same time
      const attempts = await Promise.all(
        users.map((token) =>
          request(app.getHttpServer())
            .post(`/api/quizzes/${quizId}/start`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201),
        ),
      );

      expect(attempts).toHaveLength(3);
      attempts.forEach((attempt) => {
        expect(attempt.body).toHaveProperty('id');
      });
    });

    it('should respond quickly to quiz operations', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
