import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { Prisma, PublicQuizRequestStatus } from 'generated/prisma';
import { ErrorCode } from 'src/shared/error';

@Injectable()
export class PublicQuizRequestService {
  constructor(private readonly db: DbClient) {}

  // User creates a public request for their quiz
  async createRequest(quizId: number, userId: number, reason: string) {
    // Check if quiz exists and belongs to user
    const quiz = await this.db.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Quiz not found',
      });
    }

    if (quiz.user_id !== userId) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'You can only request to make your own quiz public',
      });
    }

    if (quiz.is_public) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Quiz is already public',
      });
    }

    // Check if there's already a pending request
    const existingRequest = await this.db.publicQuizRequest.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
        status: PublicQuizRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'You already have a pending request for this quiz',
      });
    }

    const request = await this.db.publicQuizRequest.create({
      data: {
        quiz_id: quizId,
        user_id: userId,
        reason,
        status: PublicQuizRequestStatus.PENDING,
      },
      include: {
        Quiz: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          },
        },
      },
    });

    return request;
  }

  // Get request for a specific quiz
  async getRequestForQuiz(quizId: number, userId: number) {
    const request = await this.db.publicQuizRequest.findFirst({
      where: {
        quiz_id: quizId,
        user_id: userId,
      },
      orderBy: {
        create_at: 'desc',
      },
    });

    return request;
  }

  // User cancels their pending request
  async cancelRequest(requestId: number, userId: number) {
    const request = await this.db.publicQuizRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Request not found',
      });
    }

    if (request.user_id !== userId) {
      throw new ForbiddenException({
        code: ErrorCode.Forbidden,
        message: 'You can only cancel your own requests',
      });
    }

    if (request.status !== PublicQuizRequestStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Can only cancel pending requests',
      });
    }

    await this.db.publicQuizRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Request cancelled successfully' };
  }

  // Admin gets all requests
  async getAllRequests(status?: PublicQuizRequestStatus) {
    const where: Prisma.PublicQuizRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    const requests = await this.db.publicQuizRequest.findMany({
      where,
      include: {
        Quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            quiz_type: true,
            difficulty: true,
          },
        },
        User: {
          select: {
            id: true,
            account: true,
            email: true,
          },
        },
        ReviewedBy: {
          select: {
            id: true,
            account: true,
          },
        },
      },
      orderBy: {
        create_at: 'desc',
      },
    });

    return requests;
  }

  // Admin approves a request
  async approveRequest(requestId: number, adminId: number, adminNote?: string) {
    const request = await this.db.publicQuizRequest.findUnique({
      where: { id: requestId },
      include: { Quiz: true },
    });

    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Request not found',
      });
    }

    if (request.status !== PublicQuizRequestStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Request has already been reviewed',
      });
    }

    // Update request status
    await this.db.publicQuizRequest.update({
      where: { id: requestId },
      data: {
        status: PublicQuizRequestStatus.APPROVED,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        admin_note: adminNote,
      },
    });

    // Make quiz public
    await this.db.quiz.update({
      where: { id: request.quiz_id },
      data: { is_public: true },
    });

    return { message: 'Request approved and quiz is now public' };
  }

  // Admin rejects a request
  async rejectRequest(requestId: number, adminId: number, adminNote: string) {
    const request = await this.db.publicQuizRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Request not found',
      });
    }

    if (request.status !== PublicQuizRequestStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Request has already been reviewed',
      });
    }

    await this.db.publicQuizRequest.update({
      where: { id: requestId },
      data: {
        status: PublicQuizRequestStatus.REJECTED,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        admin_note: adminNote,
      },
    });

    return { message: 'Request rejected' };
  }
}
