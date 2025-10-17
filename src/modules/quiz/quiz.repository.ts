import { Injectable } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { CreateQuizDto, CreateQuestionDto, StartQuizDto, SubmitAnswerDto, UpdateQuizDto } from './dto';
import { QuizDifficulty, QuizQuestionType, Prisma } from 'generated/prisma';

@Injectable()
export class QuizRepository {
  constructor(private readonly dbClient: DbClient) {}

  get db() {
    return this.dbClient;
  }

  async createQuiz(userId: number, data: CreateQuizDto) {
    return this.db.quiz.create({
      data: {
        user_id: userId,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty || QuizDifficulty.BEGINNER,
        category: data.category,
        tags: data.tags || [],
        is_public: data.is_public || false,
      },
      include: {
        Questions: true,
      },
    });
  }

  async findAllQuizzes(userId?: number, isPublic?: boolean, category?: string, difficulty?: QuizDifficulty) {
    const where: any = {};
    
    if (userId !== undefined) {
      where.user_id = userId;
    }
    
    if (isPublic !== undefined) {
      where.is_public = isPublic;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (difficulty) {
      where.difficulty = difficulty;
    }

    return this.db.quiz.findMany({
      where,
      include: {
        Questions: {
          select: {
            id: true,
            type: true,
            order_index: true,
          },
          orderBy: {
            order_index: 'asc',
          },
        },
        User: {
          select: {
            id: true,
            account: true,
          },
        },
        _count: {
          select: {
            Attempts: true,
          },
        },
      },
      orderBy: {
        create_at: 'desc',
      },
    });
  }

  async findQuizById(quizId: number, includeAnswers = false) {
    return this.db.quiz.findUnique({
      where: { id: quizId },
      include: {
        Questions: {
          include: {
            Answers: includeAnswers,
          },
          orderBy: {
            order_index: 'asc',
          },
        },
        User: {
          select: {
            id: true,
            account: true,
          },
        },
        _count: {
          select: {
            Attempts: true,
          },
        },
      },
    });
  }

  async updateQuiz(quizId: number, data: UpdateQuizDto) {
    return this.db.quiz.update({
      where: { id: quizId },
      data,
      include: {
        Questions: true,
      },
    });
  }

  async deleteQuiz(quizId: number) {
    return this.db.quiz.delete({
      where: { id: quizId },
    });
  }

  async createQuestion(quizId: number, data: CreateQuestionDto) {
    return this.db.question.create({
      data: {
        quiz_id: quizId,
        type: data.type,
        question: data.question,
        correct_answer: data.correct_answer,
        options: data.options || Prisma.JsonNull,
        metadata: data.metadata || Prisma.JsonNull,
        order_index: data.order_index || 0,
        points: data.points || 1,
        time_limit: data.time_limit,
        explanation: data.explanation,
      },
    });
  }

  async findQuestionById(questionId: number) {
    return this.db.question.findUnique({
      where: { id: questionId },
      include: {
        Quiz: true,
      },
    });
  }

  async deleteQuestion(questionId: number) {
    return this.db.question.delete({
      where: { id: questionId },
    });
  }

  async startQuizAttempt(userId: number, quizId: number) {
    // Get quiz with questions to calculate max_score
    const quiz = await this.db.quiz.findUnique({
      where: { id: quizId },
      include: {
        Questions: true,
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const maxScore = quiz.Questions.reduce((sum, q) => sum + (q.points || 1), 0);

    return this.db.quizAttempt.create({
      data: {
        user_id: userId,
        quiz_id: quizId,
        max_score: maxScore,
      },
      include: {
        Quiz: {
          include: {
            Questions: {
              orderBy: {
                order_index: 'asc',
              },
            },
          },
        },
      },
    });
  }

  async submitAnswer(data: SubmitAnswerDto) {
    const question = await this.db.question.findUnique({
      where: { id: data.question_id },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Check if answer is correct
    let isCorrect = false;
    let points = 0;

    if (question.type === QuizQuestionType.MULTIPLE_CHOICE || question.type === QuizQuestionType.FILL_IN_BLANK) {
      isCorrect = data.user_answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    } else if (question.type === QuizQuestionType.DRAWING) {
      // For drawing, exact match or from metadata
      isCorrect = data.user_answer === question.correct_answer;
    }

    if (isCorrect) {
      points = question.points || 1;
    }

    // Create answer
    const answer = await this.db.quizAnswer.create({
      data: {
        attempt_id: data.attempt_id,
        question_id: data.question_id,
        user_answer: data.user_answer,
        is_correct: isCorrect,
        points,
        time_spent: data.time_spent || 0,
        metadata: data.metadata || Prisma.JsonNull,
      },
      include: {
        Question: true,
      },
    });

    // Update attempt score and time
    const attempt = await this.db.quizAttempt.findUnique({
      where: { id: data.attempt_id },
      include: {
        Answers: true,
        Quiz: {
          include: {
            Questions: true,
          },
        },
      },
    });

    if (attempt) {
      const totalScore = attempt.Answers.reduce((sum, a) => sum + a.points, 0);
      const totalTime = attempt.Answers.reduce((sum, a) => sum + a.time_spent, 0);
      const isCompleted = attempt.Answers.length >= attempt.Quiz.Questions.length;

      await this.db.quizAttempt.update({
        where: { id: data.attempt_id },
        data: {
          score: totalScore,
          time_spent: totalTime,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date() : null,
        },
      });
    }

    return answer;
  }

  async getAttemptById(attemptId: number) {
    return this.db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        Quiz: {
          include: {
            Questions: {
              orderBy: {
                order_index: 'asc',
              },
            },
          },
        },
        Answers: {
          include: {
            Question: true,
          },
        },
      },
    });
  }

  async getUserAttempts(userId: number, quizId?: number) {
    const where: any = { user_id: userId };
    
    if (quizId) {
      where.quiz_id = quizId;
    }

    return this.db.quizAttempt.findMany({
      where,
      include: {
        Quiz: true,
        Answers: {
          select: {
            id: true,
            is_correct: true,
            points: true,
          },
        },
      },
      orderBy: {
        started_at: 'desc',
      },
    });
  }

  async getQuizStatistics(quizId: number) {
    const attempts = await this.db.quizAttempt.findMany({
      where: {
        quiz_id: quizId,
        is_completed: true,
      },
      include: {
        Answers: true,
      },
    });

    if (attempts.length === 0) {
      return {
        total_attempts: 0,
        average_score: 0,
        average_time: 0,
        completion_rate: 0,
      };
    }

    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const totalTime = attempts.reduce((sum, a) => sum + a.time_spent, 0);
    const completedCount = attempts.filter(a => a.is_completed).length;

    return {
      total_attempts: attempts.length,
      average_score: totalScore / attempts.length,
      average_time: totalTime / attempts.length,
      completion_rate: (completedCount / attempts.length) * 100,
    };
  }
}
