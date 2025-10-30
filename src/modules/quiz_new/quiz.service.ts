import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { $Enums } from 'generated/prisma';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all quizzes (public + user's own)
  async findAll(userId?: number, query?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 50, offset = 0 } = query || {};

    const whereCondition: any = userId
      ? { OR: [{ isPublic: true }, { userId }] }
      : { OR: [{ isPublic: true }] };

    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where: whereCondition,
        include: {
          questions: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.quiz.count({ where: whereCondition }),
    ]);

    return { data, total, limit, offset };
  }

  // Get single quiz
  async findOne(id: number, userId?: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    if (!quiz.isPublic && quiz.userId !== userId) {
      throw new ForbiddenException('Cannot access private quiz');
    }

    return quiz;
  }

  // Create new quiz (stub)
  async create(userId: number, data: { title: string; description?: string }) {
    return this.prisma.quiz.create({
      data: {
        ...data,
        userId,
        isPublic: false,
      },
      include: {
        questions: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  // Update quiz
  async update(id: number, userId: number, data: { title?: string; description?: string; isPublic?: boolean }) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot update quiz you do not own');
    }

    return this.prisma.quiz.update({
      where: { id },
      data,
      include: { questions: true },
    });
  }

  // Delete quiz
  async delete(id: number, userId: number) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot delete quiz you do not own');
    }

    return this.prisma.quiz.delete({ where: { id } });
  }

  // ============ QUESTION MANAGEMENT ============

  // Add question to quiz
  async addQuestion(
    quizId: number,
    userId: number,
    data: {
      type: $Enums.QuizQuestionType;
      questionText: string;
      correctAnswer: string;
      options?: string[];
      explanation?: string;
      points?: number;
      meanings?: string[];
      order?: number;
    },
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot add questions to quiz you do not own');
    }

    // If order not provided, set to last position
    let order = data.order;
    if (order === undefined) {
      const lastQuestion = await this.prisma.question.findFirst({
        where: { quizId },
        orderBy: { order: 'desc' },
      });
      order = lastQuestion ? lastQuestion.order + 1 : 0;
    }

    return this.prisma.question.create({
      data: {
        quizId,
        type: data.type,
        questionText: data.questionText,
        correctAnswer: data.correctAnswer,
        options: data.options || undefined,
        explanation: data.explanation,
        points: data.points || 10,
        meanings: data.meanings || [],
        order,
      },
    });
  }

  // Update question
  async updateQuestion(
    quizId: number,
    questionId: number,
    userId: number,
    data: {
      type?: $Enums.QuizQuestionType;
      questionText?: string;
      correctAnswer?: string;
      options?: string[];
      explanation?: string;
      points?: number;
      meanings?: string[];
      order?: number;
    },
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot update questions in quiz you do not own');
    }

    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.quizId !== quizId) {
      throw new NotFoundException(`Question with ID ${questionId} not found in this quiz`);
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.questionText && { questionText: data.questionText }),
        ...(data.correctAnswer && { correctAnswer: data.correctAnswer }),
        ...(data.options && { options: data.options }),
        ...(data.explanation !== undefined && { explanation: data.explanation }),
        ...(data.points && { points: data.points }),
        ...(data.meanings && { meanings: data.meanings }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  // Delete question
  async deleteQuestion(quizId: number, questionId: number, userId: number) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot delete questions from quiz you do not own');
    }

    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.quizId !== quizId) {
      throw new NotFoundException(`Question with ID ${questionId} not found in this quiz`);
    }

    return this.prisma.question.delete({ where: { id: questionId } });
  }

  // Reorder questions
  async reorderQuestions(quizId: number, userId: number, questionOrders: { id: number; order: number }[]) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot reorder questions in quiz you do not own');
    }

    // Update orders in a transaction
    await this.prisma.$transaction(
      questionOrders.map(({ id, order }) =>
        this.prisma.question.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  // ============ QUIZ ATTEMPTS ============

  // Start quiz attempt
  async startQuizAttempt(quizId: number, userId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Check if user can access this quiz
    if (!quiz.isPublic && quiz.userId !== userId) {
      throw new ForbiddenException('Cannot access private quiz');
    }

    if (quiz.questions.length === 0) {
      throw new ForbiddenException('Cannot start quiz with no questions');
    }

    // Calculate max score (sum of all question points)
    const maxScore = quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
    const totalQuestions = quiz.questions.length;

    // Create attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score: 0,
        maxScore,
        correctAnswers: 0,
        totalQuestions,
        timeSpent: 0, // Will be updated on submit
        completed: false,
      },
      include: {
        quiz: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    return attempt;
  }

  // Submit quiz answers
  async submitQuizAttempt(
    attemptId: number,
    userId: number,
    answers: { questionId: number; answer: string }[],
    timeSpent?: number, // Time spent in seconds (optional)
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Cannot submit answers for attempt you do not own');
    }

    if (attempt.completed) {
      throw new ForbiddenException('Quiz attempt already completed');
    }

    // Grade answers
    let totalScore = 0;
    let correctCount = 0;
    const gradedAnswers: Array<{
      attemptId: number;
      questionId: number;
      userAnswer: string;
      isCorrect: boolean;
      points: number;
    }> = [];

    for (const answer of answers) {
      const question = attempt.quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = this.checkAnswer(question.correctAnswer, answer.answer);
      const points = isCorrect ? (question.points || 10) : 0; // Use question points, default to 10
      totalScore += points;
      if (isCorrect) correctCount++;

      gradedAnswers.push({
        attemptId,
        questionId: answer.questionId,
        userAnswer: answer.answer,
        isCorrect,
        points,
      });
    }

    // Save answers and update attempt
    await this.prisma.$transaction([
      ...gradedAnswers.map((answer) => this.prisma.quizAnswer.create({ data: answer })),
      this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: totalScore,
          correctAnswers: correctCount,
          timeSpent: timeSpent || 0,
          completed: true,
        },
      }),
    ]);

    // Return completed attempt with answers
    return this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { questions: { orderBy: { order: 'asc' } } },
        },
        answers: { include: { question: true } },
      },
    });
  }

  // Check if answer is correct (case-insensitive, trim whitespace)
  private checkAnswer(correctAnswer: string, userAnswer: string): boolean {
    return correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
  }

  // Get user's quiz attempts
  async getQuizAttempts(quizId: number, userId: number) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    return this.prisma.quizAttempt.findMany({
      where: { quizId, userId },
      include: {
        answers: { include: { question: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get single attempt details
  async getQuizAttemptDetails(attemptId: number, userId: number) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { questions: { orderBy: { order: 'asc' } } },
        },
        answers: {
          include: { question: true },
          orderBy: { question: { order: 'asc' } },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Cannot view attempt you do not own');
    }

    return attempt;
  }

  // ==================== PUBLISH REQUEST METHODS ====================

  // Request to publish a quiz
  async requestPublish(quizId: number, userId: number, message?: string) {
    // Check quiz exists and belongs to user
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (quiz.userId !== userId) {
      throw new ForbiddenException('Cannot request publish for quiz you do not own');
    }

    if (quiz.isPublic) {
      throw new BadRequestException('Quiz is already public');
    }

    // Check if quiz has questions
    if (quiz.questions.length === 0) {
      throw new BadRequestException('Cannot publish quiz with no questions');
    }

    // Check for existing pending request
    const existingRequest = await this.prisma.quizPublishRequest.findFirst({
      where: { quizId, status: 'pending' },
    });

    if (existingRequest) {
      throw new BadRequestException('Quiz already has a pending publish request');
    }

    return this.prisma.quizPublishRequest.create({
      data: {
        quizId,
        userId,
        message,
        status: 'pending',
      },
    });
  }

  // Get all pending publish requests (admin only)
  async getPendingPublishRequests() {
    return this.prisma.quizPublishRequest.findMany({
      where: { status: 'pending' },
      include: {
        quiz: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            questions: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Approve publish request (admin only)
  async approvePublishRequest(requestId: number, adminId: number) {
    const request = await this.prisma.quizPublishRequest.findUnique({
      where: { id: requestId },
      include: { quiz: true },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot approve ${request.status} request`);
    }

    // Update request and quiz in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.quizPublishRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // Make quiz public
      await tx.quiz.update({
        where: { id: request.quizId },
        data: { isPublic: true },
      });

      return updatedRequest;
    });
  }

  // Reject publish request (admin only)
  async rejectPublishRequest(requestId: number, adminId: number) {
    const request = await this.prisma.quizPublishRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot reject ${request.status} request`);
    }

    return this.prisma.quizPublishRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
  }
}
