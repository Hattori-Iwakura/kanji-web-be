import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { QuizRepository } from './quiz.repository';
import { CreateQuizDto, CreateQuestionDto, StartQuizDto, SubmitAnswerDto, UpdateQuizDto } from './dto';
import { QuizDifficulty } from 'generated/prisma';

@Injectable()
export class QuizService {
  constructor(private readonly quizRepository: QuizRepository) {}

  async createQuiz(userId: number, data: CreateQuizDto) {
    return this.quizRepository.createQuiz(userId, data);
  }

  async getAllQuizzes(userId?: number, isPublic?: boolean, category?: string, difficulty?: QuizDifficulty) {
    return this.quizRepository.findAllQuizzes(userId, isPublic, category, difficulty);
  }

  async getQuizById(quizId: number, userId?: number) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // If quiz is not public and user is not the owner, deny access
    if (!quiz.is_public && userId && quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to access this quiz');
    }

    // Don't return correct answers unless user is the owner
    if (userId !== quiz.user_id) {
      quiz.Questions = quiz.Questions.map(q => ({
        ...q,
        correct_answer: undefined as any, // Hide correct answer
      }));
    }

    return quiz;
  }

  async updateQuiz(quizId: number, userId: number, data: UpdateQuizDto) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to update this quiz');
    }

    return this.quizRepository.updateQuiz(quizId, data);
  }

  async deleteQuiz(quizId: number, userId: number) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this quiz');
    }

    return this.quizRepository.deleteQuiz(quizId);
  }

  async addQuestion(quizId: number, userId: number, data: CreateQuestionDto) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to add questions to this quiz');
    }

    return this.quizRepository.createQuestion(quizId, data);
  }

  async deleteQuestion(questionId: number, userId: number) {
    const question = await this.quizRepository.findQuestionById(questionId);
    
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.Quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this question');
    }

    return this.quizRepository.deleteQuestion(questionId);
  }

  async startQuiz(userId: number, quizId: number) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if quiz is accessible
    if (!quiz.is_public && quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to take this quiz');
    }

    if (quiz.Questions.length === 0) {
      throw new BadRequestException('Quiz has no questions');
    }

    return this.quizRepository.startQuizAttempt(userId, quizId);
  }

  async submitAnswer(userId: number, data: SubmitAnswerDto) {
    const attempt = await this.quizRepository.getAttemptById(data.attempt_id);
    
    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to submit answers for this attempt');
    }

    if (attempt.is_completed) {
      throw new BadRequestException('Quiz attempt is already completed');
    }

    // Check if question belongs to the quiz
    const questionExists = attempt.Quiz.Questions.some(q => q.id === data.question_id);
    if (!questionExists) {
      throw new BadRequestException('Question does not belong to this quiz');
    }

    // Check if question was already answered
    const alreadyAnswered = attempt.Answers.some(a => a.question_id === data.question_id);
    if (alreadyAnswered) {
      throw new BadRequestException('Question has already been answered');
    }

    return this.quizRepository.submitAnswer(data);
  }

  async getAttemptResults(attemptId: number, userId: number) {
    const attempt = await this.quizRepository.getAttemptById(attemptId);
    
    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.user_id !== userId && attempt.Quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to view these results');
    }

    return attempt;
  }

  async getUserAttempts(userId: number, quizId?: number) {
    return this.quizRepository.getUserAttempts(userId, quizId);
  }

  async getQuizStatistics(quizId: number, userId: number) {
    const quiz = await this.quizRepository.findQuizById(quizId, false);
    
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Only quiz owner can see statistics
    if (quiz.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to view quiz statistics');
    }

    return this.quizRepository.getQuizStatistics(quizId);
  }
}
