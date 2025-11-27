import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QuizRepo } from './quiz.repo';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuizQueryDto,
  SubmitQuizDto,
  QuizResultQueryDto,
} from './dtos';
import { Quiz, QuizQuestion, QuizResult, Prisma } from 'generated/prisma';

@Injectable()
export class QuizService {
  constructor(private readonly quizRepo: QuizRepo) {}

  // Quiz CRUD
  async createQuiz(data: CreateQuizDto, userId?: number): Promise<Quiz> {
    const quizData: Prisma.QuizCreateInput = {
      title: data.title,
      description: data.description,
      is_public: data.is_public ?? false,
      quiz_type: data.quiz_type,
      difficulty: data.difficulty,
      time_limit: data.time_limit,
      passing_score: data.passing_score ?? 70,
      ...(userId && {
        User: {
          connect: { id: userId }
        }
      })
    };

    return this.quizRepo.createQuiz(quizData);
  }

  async findQuizById(id: number, includeQuestions = false): Promise<Quiz | null> {
    return this.quizRepo.findQuizById(id, includeQuestions);
  }

  async findAllQuizzes(query: QuizQueryDto): Promise<Quiz[]> {
    const where: Prisma.QuizWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.quiz_type) {
      where.quiz_type = query.quiz_type;
    }

    if (query.is_public !== undefined) {
      where.is_public = query.is_public;
    }

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    return this.quizRepo.findAllQuizzes({
      where,
      orderBy: { create_at: 'desc' },
    });
  }

  async updateQuiz(id: number, data: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.quizRepo.findQuizById(id);
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return this.quizRepo.updateQuiz(id, data);
  }

  async deleteQuiz(id: number): Promise<Quiz> {
    const quiz = await this.quizRepo.findQuizById(id);
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return this.quizRepo.deleteQuiz(id);
  }

  // Question CRUD
  async createQuestion(quizId: number, data: CreateQuestionDto): Promise<QuizQuestion> {
    const quiz = await this.quizRepo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const questionData: Prisma.QuizQuestionCreateInput = {
      Quiz: { connect: { id: quizId } },
      Kanji: { connect: { id: data.kanji_id } },
      question_type: data.question_type,
      question_text: data.question_text,
      correct_answer: data.correct_answer,
      options: data.options || [],
      explanation: data.explanation,
      points: data.points ?? 1,
      order_index: data.order_index,
    };

    return this.quizRepo.createQuestion(questionData);
  }

  async bulkCreateQuestions(quizId: number, questions: CreateQuestionDto[]): Promise<number> {
    const quiz = await this.quizRepo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const questionsData: Prisma.QuizQuestionCreateManyInput[] = questions.map((q, index) => ({
      quiz_id: quizId,
      kanji_id: q.kanji_id,
      question_type: q.question_type,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      options: q.options || [],
      explanation: q.explanation,
      points: q.points ?? 1,
      order_index: q.order_index ?? index,
    }));

    return this.quizRepo.createManyQuestions(questionsData);
  }

  async findQuestionById(id: number): Promise<QuizQuestion | null> {
    return this.quizRepo.findQuestionById(id);
  }

  async findQuestionsByQuizId(quizId: number): Promise<QuizQuestion[]> {
    return this.quizRepo.findQuestionsByQuizId(quizId);
  }

  async updateQuestion(id: number, data: UpdateQuestionDto): Promise<QuizQuestion> {
    const question = await this.quizRepo.findQuestionById(id);
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const updateData: Prisma.QuizQuestionUpdateInput = {};

    if (data.kanji_id) {
      updateData.Kanji = { connect: { id: data.kanji_id } };
    }

    if (data.question_type) updateData.question_type = data.question_type;
    if (data.question_text) updateData.question_text = data.question_text;
    if (data.correct_answer) updateData.correct_answer = data.correct_answer;
    if (data.options) updateData.options = data.options;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.points) updateData.points = data.points;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;

    return this.quizRepo.updateQuestion(id, updateData);
  }

  async deleteQuestion(id: number): Promise<QuizQuestion> {
    const question = await this.quizRepo.findQuestionById(id);
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return this.quizRepo.deleteQuestion(id);
  }

  // Quiz submission and results
  async submitQuiz(quizId: number, userId: number, data: SubmitQuizDto): Promise<QuizResult> {
    const quiz = await this.quizRepo.findQuizById(quizId, true);
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const questions = await this.quizRepo.findQuestionsByQuizId(quizId);
    if (questions.length === 0) {
      throw new BadRequestException('Quiz has no questions');
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const detailedAnswers = data.answers.map(answer => {
      const question = questions.find(q => q.id === answer.question_id);
      if (!question) {
        return {
          question_id: answer.question_id,
          user_answer: answer.user_answer,
          is_correct: false,
          correct_answer: null,
        };
      }

      totalPoints += question.points;
      const isCorrect = answer.user_answer.trim().toLowerCase() === 
                       question.correct_answer.trim().toLowerCase();
      
      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question.points;
      }

      return {
        question_id: answer.question_id,
        user_answer: answer.user_answer,
        is_correct: isCorrect,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
      };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const resultData: Prisma.QuizResultCreateInput = {
      Quiz: { connect: { id: quizId } },
      User: { connect: { id: userId } },
      score,
      total_questions: questions.length,
      correct_answers: correctAnswers,
      time_taken: data.time_taken,
      answers: detailedAnswers,
    };

    return this.quizRepo.createQuizResult(resultData);
  }

  async findResultById(id: number): Promise<QuizResult | null> {
    return this.quizRepo.findResultById(id);
  }

  async findResults(query: QuizResultQueryDto): Promise<QuizResult[]> {
    // Convert string to number if needed
    const quizId = query.quiz_id ? Number(query.quiz_id) : undefined;
    const userId = query.user_id ? Number(query.user_id) : undefined;
    const limit = query.limit ? Number(query.limit) : 10;

    if (quizId) {
      return this.quizRepo.findResultsByQuizId(quizId, limit);
    }

    if (userId) {
      return this.quizRepo.findResultsByUserId(userId, limit);
    }

    throw new BadRequestException('Either quiz_id or user_id must be provided');
  }

  async findUserResultsForQuiz(userId: number, quizId: number): Promise<QuizResult[]> {
    return this.quizRepo.findUserResultForQuiz(userId, quizId);
  }
}
