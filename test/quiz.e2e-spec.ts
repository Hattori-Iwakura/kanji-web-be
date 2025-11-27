import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DbClient } from '../src/modules/db_client/db_client.service';
import { QuizType, DifficultyLevel, QuestionType } from '../generated/prisma';

describe('Quiz Module (e2e)', () => {
  let app: INestApplication;
  let dbClient: DbClient;
  let accessToken: string;
  let createdQuizId: number;
  let createdQuestionIds: number[] = [];

  // Helper function to unwrap response data (due to TransformInterceptor)
  const unwrap = (response: any) => response.body.data || response.body;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    dbClient = app.get<DbClient>(DbClient);

    // Clean up test data before running tests
    await cleanupTestData();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        account: 'admin',
        password: '123456',
      })
      .expect(201);

    // Response is wrapped in data object by TransformInterceptor
    const loginData = unwrap(loginResponse);
    accessToken = loginData.accessToken;
    
    if (!accessToken) {
      console.error('❌ Failed to get access token from login');
      console.error('Login response:', JSON.stringify(loginResponse.body, null, 2));
      throw new Error('No access token received from login');
    }
    
    console.log('✅ Access token obtained successfully');
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    // Delete test quiz results
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.quizResult.deleteMany({
      where: {
        Quiz: {
          title: {
            contains: 'Test Quiz',
          },
        },
      },
    });

    // Delete test questions
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.quizQuestion.deleteMany({
      where: {
        Quiz: {
          title: {
            contains: 'Test Quiz',
          },
        },
      },
    });

    // Delete test quizzes
    // @ts-ignore - Prisma client has these properties at runtime
    await dbClient.quiz.deleteMany({
      where: {
        title: {
          contains: 'Test Quiz',
        },
      },
    });
  }

  describe('Quiz CRUD Operations', () => {
    describe('POST /quiz', () => {
      it('should create a new quiz', async () => {
        const createQuizDto = {
          title: 'Test Quiz - JLPT N5',
          description: 'A test quiz for JLPT N5 level',
          is_public: true,
          quiz_type: QuizType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          time_limit: 600,
          passing_score: 70,
        };

        const response = await request(app.getHttpServer())
          .post('/quiz')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createQuizDto)
          .expect(201);

        const quiz = response.body.data || response.body;
        expect(quiz).toHaveProperty('id');
        expect(quiz.title).toBe(createQuizDto.title);
        expect(quiz.description).toBe(createQuizDto.description);
        expect(quiz.is_public).toBe(true);
        expect(quiz.quiz_type).toBe(QuizType.MULTIPLE_CHOICE);
        expect(quiz.difficulty).toBe(DifficultyLevel.EASY);

        createdQuizId = quiz.id;
      });

      it('should fail to create quiz without authentication', async () => {
        const createQuizDto = {
          title: 'Test Quiz - Unauthorized',
          description: 'This should fail',
        };

        await request(app.getHttpServer())
          .post('/quiz')
          .send(createQuizDto)
          .expect(401);
      });

      it('should fail with invalid data', async () => {
        const invalidDto = {
          title: '', // Empty title should fail
          passing_score: 150, // Invalid score (> 100)
        };

        await request(app.getHttpServer())
          .post('/quiz')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /quiz', () => {
      it('should get all quizzes', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz')
          .expect(200);

        const quizzes = unwrap(response);
        expect(Array.isArray(quizzes)).toBe(true);
        expect(quizzes.length).toBeGreaterThan(0);
        
        const testQuiz = quizzes.find((q: any) => q.id === createdQuizId);
        expect(testQuiz).toBeDefined();
      });

      it('should filter quizzes by difficulty', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz')
          .query({ difficulty: DifficultyLevel.EASY })
          .expect(200);

        const quizzes = unwrap(response);
        expect(Array.isArray(quizzes)).toBe(true);
        quizzes.forEach((quiz: any) => {
          expect(quiz.difficulty).toBe(DifficultyLevel.EASY);
        });
      });

      it('should search quizzes by title', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz')
          .query({ search: 'Test Quiz' })
          .expect(200);

        const quizzes = unwrap(response);
        expect(Array.isArray(quizzes)).toBe(true);
        quizzes.forEach((quiz: any) => {
          expect(quiz.title.toLowerCase()).toContain('test quiz');
        });
      });
    });

    describe('GET /quiz/:id', () => {
      it('should get quiz by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/quiz/${createdQuizId}`)
          .expect(200);

        const quiz = unwrap(response);
        expect(quiz.id).toBe(createdQuizId);
        expect(quiz.title).toContain('Test Quiz');
      });

      it('should get quiz with questions', async () => {
        const response = await request(app.getHttpServer())
          .get(`/quiz/${createdQuizId}`)
          .query({ include_questions: 'true' })
          .expect(200);

        const quiz = unwrap(response);
        expect(quiz).toHaveProperty('Questions');
        expect(Array.isArray(quiz.Questions)).toBe(true);
      });

      it('should return 404 for non-existent quiz', async () => {
        await request(app.getHttpServer())
          .get('/quiz/99999')
          .expect(404);
      });
    });

    describe('PUT /quiz/:id', () => {
      it('should update quiz', async () => {
        const updateDto = {
          title: 'Test Quiz - JLPT N5 (Updated)',
          difficulty: DifficultyLevel.MEDIUM,
          time_limit: 900,
        };

        const response = await request(app.getHttpServer())
          .put(`/quiz/${createdQuizId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateDto)
          .expect(200);

        const quiz = unwrap(response);
        expect(quiz.title).toBe(updateDto.title);
        expect(quiz.difficulty).toBe(DifficultyLevel.MEDIUM);
        expect(quiz.time_limit).toBe(900);
      });

      it('should fail to update without authentication', async () => {
        await request(app.getHttpServer())
          .put(`/quiz/${createdQuizId}`)
          .send({ title: 'Should fail' })
          .expect(401);
      });
    });
  });

  describe('Question CRUD Operations', () => {
    let testKanjiId: number;

    beforeAll(async () => {
      // Get a kanji for testing
      // @ts-ignore - Prisma client has these properties at runtime
      const kanji = await dbClient.kanji.findFirst();
      testKanjiId = kanji!.id;
    });

    describe('POST /quiz/:quizId/questions', () => {
      it('should add a question to quiz', async () => {
        const createQuestionDto = {
          kanji_id: testKanjiId,
          question_type: QuestionType.KANJI_TO_MEANING,
          question_text: 'What is the meaning of this kanji?',
          correct_answer: 'day, sun',
          options: ['day, sun', 'moon, month', 'fire', 'water'],
          explanation: 'This kanji means day or sun',
          points: 1,
          order_index: 0,
        };

        const response = await request(app.getHttpServer())
          .post(`/quiz/${createdQuizId}/questions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createQuestionDto)
          .expect(201);

        const question = unwrap(response);
        expect(question).toHaveProperty('id');
        expect(question.quiz_id).toBe(createdQuizId);
        expect(question.question_text).toBe(createQuestionDto.question_text);
        expect(question.correct_answer).toBe(createQuestionDto.correct_answer);
        expect(question.Kanji).toBeDefined();

        createdQuestionIds.push(question.id);
      });

      it('should fail to add question without authentication', async () => {
        const createQuestionDto = {
          kanji_id: testKanjiId,
          question_type: QuestionType.KANJI_TO_MEANING,
          question_text: 'This should fail',
          correct_answer: 'answer',
        };

        await request(app.getHttpServer())
          .post(`/quiz/${createdQuizId}/questions`)
          .send(createQuestionDto)
          .expect(401);
      });

      it('should fail with invalid question type', async () => {
        const invalidDto = {
          kanji_id: testKanjiId,
          question_type: 'INVALID_TYPE',
          question_text: 'Invalid question',
          correct_answer: 'answer',
        };

        await request(app.getHttpServer())
          .post(`/quiz/${createdQuizId}/questions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('POST /quiz/:quizId/questions/bulk', () => {
      it('should add multiple questions at once', async () => {
        const bulkDto = {
          questions: [
            {
              kanji_id: testKanjiId,
              question_type: QuestionType.KANJI_TO_ONYOMI,
              question_text: 'What is the Onyomi reading?',
              correct_answer: 'ニチ',
              options: ['ニチ', 'ゲツ', 'カ', 'スイ'],
              points: 1,
            },
            {
              kanji_id: testKanjiId,
              question_type: QuestionType.KANJI_TO_KUNYOMI,
              question_text: 'What is the Kunyomi reading?',
              correct_answer: 'ひ',
              options: ['ひ', 'つき', 'ひ', 'みず'],
              points: 1,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post(`/quiz/${createdQuizId}/questions/bulk`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(bulkDto)
          .expect(201);

        const result = unwrap(response);
        expect(result.count).toBe(2);
        expect(result.message).toContain('2 questions');
      });
    });

    describe('GET /quiz/:quizId/questions', () => {
      it('should get all questions for a quiz', async () => {
        const response = await request(app.getHttpServer())
          .get(`/quiz/${createdQuizId}/questions`)
          .expect(200);

        const questions = unwrap(response);
        expect(Array.isArray(questions)).toBe(true);
        expect(questions.length).toBeGreaterThan(0);
        
        questions.forEach((question: any) => {
          expect(question.quiz_id).toBe(createdQuizId);
          expect(question.Kanji).toBeDefined();
        });
      });
    });

    describe('GET /quiz/questions/:id', () => {
      it('should get question by id', async () => {
        const questionId = createdQuestionIds[0];
        const response = await request(app.getHttpServer())
          .get(`/quiz/questions/${questionId}`)
          .expect(200);

        const question = unwrap(response);
        expect(question.id).toBe(questionId);
        expect(question.Kanji).toBeDefined();
        expect(question.Quiz).toBeDefined();
      });

      it('should return 404 for non-existent question', async () => {
        await request(app.getHttpServer())
          .get('/quiz/questions/99999')
          .expect(404);
      });
    });

    describe('PUT /quiz/questions/:id', () => {
      it('should update question', async () => {
        const questionId = createdQuestionIds[0];
        const updateDto = {
          question_text: 'Updated question text',
          points: 2,
        };

        const response = await request(app.getHttpServer())
          .put(`/quiz/questions/${questionId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateDto)
          .expect(200);

        const question = unwrap(response);
        expect(question.question_text).toBe(updateDto.question_text);
        expect(question.points).toBe(2);
      });

      it('should fail to update without authentication', async () => {
        const questionId = createdQuestionIds[0];
        await request(app.getHttpServer())
          .put(`/quiz/questions/${questionId}`)
          .send({ question_text: 'Should fail' })
          .expect(401);
      });
    });

    describe('DELETE /quiz/questions/:id', () => {
      it('should delete question', async () => {
        const questionId = createdQuestionIds[0];
        await request(app.getHttpServer())
          .delete(`/quiz/questions/${questionId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verify deletion
        await request(app.getHttpServer())
          .get(`/quiz/questions/${questionId}`)
          .expect(404);
      });

      it('should fail to delete without authentication', async () => {
        const questionId = createdQuestionIds[1];
        await request(app.getHttpServer())
          .delete(`/quiz/questions/${questionId}`)
          .expect(401);
      });
    });
  });

  describe('Quiz Submission and Results', () => {
    let submissionQuizId: number;
    let submissionQuestions: any[];

    beforeAll(async () => {
      // Create a new quiz for submission tests
      // @ts-ignore - Prisma client has these properties at runtime
      const quiz = await dbClient.quiz.create({
        data: {
          title: 'Test Quiz - Submission',
          description: 'Quiz for testing submission',
          is_public: true,
          quiz_type: QuizType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          passing_score: 70,
        },
      });
      submissionQuizId = quiz.id;

      // Get test kanji
      // @ts-ignore - Prisma client has these properties at runtime
      const kanjis = await dbClient.kanji.findMany({ take: 3 });

      // Create questions
      const questions = await Promise.all([
        // @ts-ignore - Prisma client has these properties at runtime
        dbClient.quizQuestion.create({
          data: {
            quiz_id: submissionQuizId,
            kanji_id: kanjis[0].id,
            question_type: QuestionType.KANJI_TO_MEANING,
            question_text: 'Question 1',
            correct_answer: 'answer1',
            options: ['answer1', 'wrong1', 'wrong2', 'wrong3'],
            points: 1,
            order_index: 0,
          },
        }),
        // @ts-ignore - Prisma client has these properties at runtime
        dbClient.quizQuestion.create({
          data: {
            quiz_id: submissionQuizId,
            kanji_id: kanjis[1].id,
            question_type: QuestionType.KANJI_TO_ONYOMI,
            question_text: 'Question 2',
            correct_answer: 'answer2',
            options: ['answer2', 'wrong1', 'wrong2', 'wrong3'],
            points: 1,
            order_index: 1,
          },
        }),
        // @ts-ignore - Prisma client has these properties at runtime
        dbClient.quizQuestion.create({
          data: {
            quiz_id: submissionQuizId,
            kanji_id: kanjis[2].id,
            question_type: QuestionType.KANJI_TO_KUNYOMI,
            question_text: 'Question 3',
            correct_answer: 'answer3',
            options: ['answer3', 'wrong1', 'wrong2', 'wrong3'],
            points: 1,
            order_index: 2,
          },
        }),
      ]);

      submissionQuestions = questions;
    });

    describe('POST /quiz/:quizId/submit', () => {
      it('should submit quiz with all correct answers', async () => {
        const submitDto = {
          answers: [
            { question_id: submissionQuestions[0].id, user_answer: 'answer1' },
            { question_id: submissionQuestions[1].id, user_answer: 'answer2' },
            { question_id: submissionQuestions[2].id, user_answer: 'answer3' },
          ],
          time_taken: 120,
        };

        const response = await request(app.getHttpServer())
          .post(`/quiz/${submissionQuizId}/submit`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(submitDto)
          .expect(201);

        const result = unwrap(response);
        expect(result).toHaveProperty('id');
        expect(result.quiz_id).toBe(submissionQuizId);
        expect(result.score).toBe(100);
        expect(result.correct_answers).toBe(3);
        expect(result.total_questions).toBe(3);
        expect(result.time_taken).toBe(120);
        expect(Array.isArray(result.answers)).toBe(true);
        
        result.answers.forEach((answer: any) => {
          expect(answer.is_correct).toBe(true);
        });
      });

      it('should submit quiz with partial correct answers', async () => {
        const submitDto = {
          answers: [
            { question_id: submissionQuestions[0].id, user_answer: 'answer1' },
            { question_id: submissionQuestions[1].id, user_answer: 'wrong_answer' },
            { question_id: submissionQuestions[2].id, user_answer: 'answer3' },
          ],
          time_taken: 150,
        };

        const response = await request(app.getHttpServer())
          .post(`/quiz/${submissionQuizId}/submit`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(submitDto)
          .expect(201);

        const result = unwrap(response);
        expect(result.score).toBe(67); // 2/3 = 66.67% rounded to 67
        expect(result.correct_answers).toBe(2);
        expect(result.total_questions).toBe(3);

        const wrongAnswer = result.answers.find(
          (a: any) => a.question_id === submissionQuestions[1].id
        );
        expect(wrongAnswer.is_correct).toBe(false);
        expect(wrongAnswer.correct_answer).toBe('answer2');
      });

      it('should fail to submit without authentication', async () => {
        const submitDto = {
          answers: [
            { question_id: submissionQuestions[0].id, user_answer: 'answer1' },
          ],
        };

        await request(app.getHttpServer())
          .post(`/quiz/${submissionQuizId}/submit`)
          .send(submitDto)
          .expect(401);
      });

      it('should fail to submit to non-existent quiz', async () => {
        const submitDto = {
          answers: [
            { question_id: submissionQuestions[0].id, user_answer: 'answer1' },
          ],
        };

        await request(app.getHttpServer())
          .post('/quiz/99999/submit')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(submitDto)
          .expect(404);
      });
    });

    describe('GET /quiz/result/:id', () => {
      let resultId: number;

      beforeAll(async () => {
        // Create a result for testing
        // @ts-ignore - Prisma client has these properties at runtime
        const result = await dbClient.quizResult.create({
          data: {
            quiz_id: submissionQuizId,
            user_id: 1,
            score: 100,
            total_questions: 3,
            correct_answers: 3,
            time_taken: 120,
            answers: [
              { question_id: submissionQuestions[0].id, is_correct: true },
            ],
          },
        });
        resultId = result.id;
      });

      it('should get result by id', async () => {
        const response = await request(app.getHttpServer())
          .get(`/quiz/result/${resultId}`)
          .expect(200);

        const result = unwrap(response);
        expect(result.id).toBe(resultId);
        expect(result.Quiz).toBeDefined();
        expect(result.User).toBeDefined();
      });

      it('should return 404 for non-existent result', async () => {
        await request(app.getHttpServer())
          .get('/quiz/result/99999')
          .expect(404);
      });
    });

    describe('GET /quiz/results', () => {
      it('should get results by quiz_id', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/results')
          .query({ quiz_id: submissionQuizId });
        
        if (response.status !== 200) {
          console.error('❌ GET /quiz/results failed:', response.body);
        }
        
        expect(response.status).toBe(200);

        const results = unwrap(response);
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        
        results.forEach((result: any) => {
          expect(result.quiz_id).toBe(submissionQuizId);
          expect(result.User).toBeDefined();
        });
      });

      it('should get results by user_id', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/results')
          .query({ user_id: 1 })
          .expect(200);

        const results = unwrap(response);
        expect(Array.isArray(results)).toBe(true);
        results.forEach((result: any) => {
          expect(result.user_id).toBe(1);
          expect(result.Quiz).toBeDefined();
        });
      });

      it('should fail without quiz_id or user_id', async () => {
        await request(app.getHttpServer())
          .get('/quiz/results')
          .expect(400);
      });
    });

    describe('GET /quiz/:quizId/my-results', () => {
      it('should get user results for specific quiz', async () => {
        const response = await request(app.getHttpServer())
          .get(`/quiz/${submissionQuizId}/my-results`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const results = unwrap(response);
        expect(Array.isArray(results)).toBe(true);
        results.forEach((result: any) => {
          expect(result.quiz_id).toBe(submissionQuizId);
        });
      });

      it('should fail without authentication', async () => {
        await request(app.getHttpServer())
          .get(`/quiz/${submissionQuizId}/my-results`)
          .expect(401);
      });
    });
  });

  describe('DELETE /quiz/:id', () => {
    it('should delete quiz and cascade delete questions and results', async () => {
      // Verify quiz exists with questions and results
      // @ts-ignore - Prisma client has these properties at runtime
      const questionsBeforeDelete = await dbClient.quizQuestion.findMany({
        where: { quiz_id: createdQuizId },
      });
      expect(questionsBeforeDelete.length).toBeGreaterThan(0);

      // Delete quiz
      await request(app.getHttpServer())
        .delete(`/quiz/${createdQuizId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify quiz is deleted
      await request(app.getHttpServer())
        .get(`/quiz/${createdQuizId}`)
        .expect(404);

      // Verify questions are cascade deleted
      // @ts-ignore - Prisma client has these properties at runtime
      const questionsAfterDelete = await dbClient.quizQuestion.findMany({
        where: { quiz_id: createdQuizId },
      });
      expect(questionsAfterDelete.length).toBe(0);
    });

    it('should fail to delete without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/quiz/${createdQuizId}`)
        .expect(401);
    });
  });
});
