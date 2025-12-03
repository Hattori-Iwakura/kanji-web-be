import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import {
  CreatePublicDeckRequestDto,
  ReviewPublicDeckRequestDto,
  PublicDeckRequestStatus,
  PublicDeckRequestQueryDto,
} from './dtos/public-deck-request.dto';

@Injectable()
export class PublicDeckRequestService {
  constructor(private readonly dbClient: DbClient) {}

  async createRequest(dto: CreatePublicDeckRequestDto, userId: number) {
    const deck = await this.dbClient.flashcardDeck.findUnique({
      where: { id: dto.deck_id },
    });

    if (!deck) {
      throw new NotFoundException('Deck không tồn tại');
    }

    if (deck.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền với deck này');
    }

    if (deck.is_public) {
      throw new BadRequestException('Deck này đã được public');
    }

    const existingRequest = await this.dbClient.publicDeckRequest.findFirst({
      where: {
        deck_id: dto.deck_id,
        status: PublicDeckRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Deck này đã có yêu cầu đang chờ xét duyệt');
    }

    const request = await this.dbClient.publicDeckRequest.create({
      data: {
        deck_id: dto.deck_id,
        user_id: userId,
        reason: dto.reason,
        status: PublicDeckRequestStatus.PENDING,
      },
      include: {
        Deck: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return request;
  }

  async getMyRequests(userId: number) {
    const requests = await this.dbClient.publicDeckRequest.findMany({
      where: { user_id: userId },
      include: {
        Deck: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: { Cards: true },
            },
          },
        },
      },
      orderBy: { create_at: 'desc' },
    });

    return requests;
  }

  async checkDeckRequest(deckId: number, userId: number) {
    console.log(`[checkDeckRequest] Checking deck ${deckId} for user ${userId}`);
    
    const deck = await this.dbClient.flashcardDeck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      console.log(`[checkDeckRequest] Deck ${deckId} not found`);
      throw new NotFoundException('Deck không tồn tại');
    }

    console.log(`[checkDeckRequest] Deck found:`, { id: deck.id, user_id: deck.user_id, name: deck.name });

    if (deck.user_id !== userId) {
      console.log(`[checkDeckRequest] Access denied: deck.user_id=${deck.user_id}, userId=${userId}`);
      throw new ForbiddenException('Bạn không có quyền với deck này');
    }

    const request = await this.dbClient.publicDeckRequest.findFirst({
      where: {
        deck_id: deckId,
        status: PublicDeckRequestStatus.PENDING,
      },
    });

    console.log(`[checkDeckRequest] Request found:`, request ? { id: request.id, deck_id: request.deck_id, reason: request.reason } : null);

    return request;
  }

  async cancelRequest(requestId: number, userId: number) {
    const request = await this.dbClient.publicDeckRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }

    if (request.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền với yêu cầu này');
    }

    if (request.status !== PublicDeckRequestStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu đang chờ xét duyệt');
    }

    await this.dbClient.publicDeckRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Đã hủy yêu cầu thành công' };
  }

  async getAllRequests(query: PublicDeckRequestQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [requests, total] = await Promise.all([
      this.dbClient.publicDeckRequest.findMany({
        where,
        include: {
          Deck: {
            select: {
              id: true,
              name: true,
              description: true,
              _count: {
                select: { Cards: true },
              },
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
        orderBy: { create_at: 'desc' },
        skip,
        take: limit,
      }),
      this.dbClient.publicDeckRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewRequest(requestId: number, dto: ReviewPublicDeckRequestDto, adminId: number) {
    const request = await this.dbClient.publicDeckRequest.findUnique({
      where: { id: requestId },
      include: { Deck: true },
    });

    if (!request) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }

    if (request.status !== PublicDeckRequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xét duyệt');
    }

    if (dto.status === PublicDeckRequestStatus.REJECTED && !dto.admin_note) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }

    const updatedRequest = await this.dbClient.publicDeckRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        admin_note: dto.admin_note,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
    });

    if (dto.status === PublicDeckRequestStatus.APPROVED) {
      await this.dbClient.flashcardDeck.update({
        where: { id: request.deck_id },
        data: { is_public: true },
      });
    }

    return updatedRequest;
  }
}
