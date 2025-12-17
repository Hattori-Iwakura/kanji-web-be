import { Injectable } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { Quiz, QuizQuestion, QuizResult, Prisma } from 'generated/prisma';

@Injectable()
export class QuizRepo {
  constructor(private readonly db: DbClient) {}

  // Quiz CRUD
  async createQuiz(data: Prisma.QuizCreateInput): Promise<Quiz> {
    return this.db.quiz.create({ data });
  }

  async findQuizById(id: number, includeQuestions = false): Promise<Quiz | null> {
    return this.db.quiz.findUnique({
      where: { id },
      include: {
        Questions: includeQuestions ? {
          include: { Kanji: true },
          orderBy: { order_index: 'asc' }
        } : false,
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          }
        }
      },
    });
  }

  async findAllQuizzes(params: {
    where?: Prisma.QuizWhereInput;
    orderBy?: Prisma.QuizOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Quiz[]> {
    return this.db.quiz.findMany({
      ...params,
      include: {
        User: {
          select: {
            id: true,
            account: true,
            profile_image: true,
            UserProfile: {
              select: {
                display_name: true,
              },
            },
          }
        },
        _count: {
          select: {
            Questions: true,
            Results: true,
          }
        }
      },
    });
  }

  async updateQuiz(id: number, data: Prisma.QuizUpdateInput): Promise<Quiz> {
    return this.db.quiz.update({
      where: { id },
      data,
    });
  }

  async deleteQuiz(id: number): Promise<Quiz> {
    return this.db.quiz.delete({
      where: { id },
    });
  }

  // Question CRUD
  async createQuestion(data: Prisma.QuizQuestionCreateInput): Promise<QuizQuestion> {
    return this.db.quizQuestion.create({
      data,
      include: { Kanji: true }
    });
  }

  async createManyQuestions(data: Prisma.QuizQuestionCreateManyInput[]): Promise<number> {
    const result = await this.db.quizQuestion.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  async findQuestionById(id: number): Promise<QuizQuestion | null> {
    return this.db.quizQuestion.findUnique({
      where: { id },
      include: { Kanji: true, Quiz: true }
    });
  }

  async findQuestionsByQuizId(quizId: number): Promise<QuizQuestion[]> {
    return this.db.quizQuestion.findMany({
      where: { quiz_id: quizId },
      include: { Kanji: true },
      orderBy: { order_index: 'asc' }
    });
  }

  async updateQuestion(id: number, data: Prisma.QuizQuestionUpdateInput): Promise<QuizQuestion> {
    return this.db.quizQuestion.update({
      where: { id },
      data,
      include: { Kanji: true }
    });
  }

  async deleteQuestion(id: number): Promise<QuizQuestion> {
    return this.db.quizQuestion.delete({
      where: { id },
    });
  }

  async deleteQuestionsByQuizId(quizId: number): Promise<number> {
    const result = await this.db.quizQuestion.deleteMany({
      where: { quiz_id: quizId },
    });
    return result.count;
  }

  // Quiz Result
  async createQuizResult(data: Prisma.QuizResultCreateInput): Promise<QuizResult> {
    return this.db.quizResult.create({
      data,
      include: {
        Quiz: true,
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          }
        }
      }
    });
  }

  async findResultById(id: number): Promise<QuizResult | null> {
    return this.db.quizResult.findUnique({
      where: { id },
      include: {
        Quiz: true,
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          }
        }
      }
    });
  }

  async findResultsByQuizId(quizId: number, limit = 10): Promise<QuizResult[]> {
    return this.db.quizResult.findMany({
      where: { quiz_id: quizId },
      include: {
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          }
        }
      },
      orderBy: { completed_at: 'desc' },
      take: limit,
    });
  }

  async findResultsByUserId(userId: number, limit = 10): Promise<QuizResult[]> {
    return this.db.quizResult.findMany({
      where: { user_id: userId },
      include: {
        Quiz: true,
      },
      orderBy: { completed_at: 'desc' },
      take: limit,
    });
  }

  async findUserResultForQuiz(userId: number, quizId: number): Promise<QuizResult[]> {
    return this.db.quizResult.findMany({
      where: {
        user_id: userId,
        quiz_id: quizId,
      },
      orderBy: { completed_at: 'desc' },
    });
  }
}
