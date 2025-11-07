import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

type PublishRequestStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class FlashcardDeckService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all flashcard decks (public + user's own)
  async findAll(userId?: number, query?: { search?: string; limit?: number; offset?: number }) {
    const { search, limit = 50, offset = 0 } = query || {};

    const whereCondition: any = userId
      ? { OR: [{ isPublic: true }, { userId }] }
      : { OR: [{ isPublic: true }] };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.flashcardDeck.findMany({
        where: whereCondition,
        include: {
          cards: { include: { kanji: true } },
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.flashcardDeck.count({ where: whereCondition }),
    ]);

    return { data, total, limit, offset };
  }

  // Get single deck
  async findOne(id: number, userId?: number) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { id },
      include: {
        cards: { include: { kanji: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${id} not found`);
    }

    if (!deck.isPublic && deck.userId !== userId) {
      throw new ForbiddenException('Cannot access private deck');
    }

    return deck;
  }

  // Create new deck
  async create(userId: number, data: { name: string; description?: string; kanjiIds?: number[] }) {
    const { name, description, kanjiIds = [] } = data;

    // Verify all kanji exist
    if (kanjiIds.length > 0) {
      const kanjiCount = await this.prisma.kanji.count({
        where: { id: { in: kanjiIds } },
      });
      if (kanjiCount !== kanjiIds.length) {
        throw new BadRequestException('Some kanji IDs are invalid');
      }
    }

    return this.prisma.flashcardDeck.create({
      data: {
        name,
        description,
        userId,
        isPublic: false,
        cards: {
          create: kanjiIds.map((kanjiId) => ({
            kanjiId,
            front: 'Front content', // Placeholder
            back: 'Back content', // Placeholder
          })),
        },
      },
      include: {
        cards: { include: { kanji: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  // Update deck
  async update(id: number, userId: number, data: { name?: string; description?: string; isPublic?: boolean }, userRole?: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({ where: { id } });
    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${id} not found`);
    }
    // Allow update if user owns the deck OR user is an admin
    if (deck.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Cannot update deck you do not own');
    }

    return this.prisma.flashcardDeck.update({
      where: { id },
      data,
      include: {
        cards: { include: { kanji: true } },
      },
    });
  }

  // Delete deck
  async delete(id: number, userId: number, userRole?: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({ where: { id } });
    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${id} not found`);
    }
    // Allow delete if user owns the deck OR user is an admin
    if (deck.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Cannot delete deck you do not own');
    }

    return this.prisma.flashcardDeck.delete({ where: { id } });
  }

  // Add kanji card to deck
  async addCard(deckId: number, userId: number, kanjiId: number, userRole?: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({ where: { id: deckId } });
    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${deckId} not found`);
    }
    // Allow modification if user owns the deck OR user is an admin
    if (deck.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Cannot modify deck you do not own');
    }

    // Check if kanji exists
    const kanji = await this.prisma.kanji.findUnique({ where: { id: kanjiId } });
    if (!kanji) {
      throw new NotFoundException(`Kanji with ID ${kanjiId} not found`);
    }

    // Check if card already exists
    const existingCard = await this.prisma.flashcardCard.findUnique({
      where: { deckId_kanjiId: { deckId, kanjiId } },
    });
    if (existingCard) {
      throw new BadRequestException('Kanji already in deck');
    }

    await this.prisma.flashcardCard.create({
      data: {
        deckId,
        kanjiId,
        front: 'Front content', // Placeholder
        back: 'Back content', // Placeholder
      },
    });

    return this.findOne(deckId, userId);
  }

  // Remove card from deck
  async removeCard(deckId: number, userId: number, kanjiId: number, userRole?: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({ where: { id: deckId } });
    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${deckId} not found`);
    }
    // Allow modification if user owns the deck OR user is an admin
    if (deck.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Cannot modify deck you do not own');
    }

    const card = await this.prisma.flashcardCard.findUnique({
      where: { deckId_kanjiId: { deckId, kanjiId } },
    });
    if (!card) {
      throw new NotFoundException('Kanji not found in deck');
    }

    await this.prisma.flashcardCard.delete({
      where: { deckId_kanjiId: { deckId, kanjiId } },
    });

    return this.findOne(deckId, userId);
  }

  // Submit deck for publishing
  async requestPublish(deckId: number, userId: number) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { id: deckId },
      include: { cards: true },
    });

    if (!deck) {
      throw new NotFoundException(`Flashcard deck with ID ${deckId} not found`);
    }

    if (deck.userId !== userId) {
      throw new ForbiddenException('Cannot publish deck you do not own');
    }

    if (deck.isPublic) {
      throw new BadRequestException('Deck is already public');
    }

    if (deck.cards.length === 0) {
      throw new BadRequestException('Cannot publish empty deck');
    }

    // Check for existing pending request
    const existingRequest = await this.prisma.flashcardDeckPublishRequest.findFirst({
      where: {
        deckId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Publish request already pending');
    }

    return this.prisma.flashcardDeckPublishRequest.create({
      data: {
        deckId,
        userId,
        status: 'pending',
      },
    });
  }

  // Admin: Get publish requests
  async getPublishRequests(status?: PublishRequestStatus) {
    return this.prisma.flashcardDeckPublishRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: Approve publish request
  async approvePublishRequest(requestId: number, adminId: number) {
    const request = await this.prisma.flashcardDeckPublishRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    await this.prisma.$transaction([
      this.prisma.flashcardDeck.update({
        where: { id: request.deckId },
        data: { isPublic: true },
      }),
      this.prisma.flashcardDeckPublishRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Publish request approved', deckId: request.deckId };
  }

  // Admin: Reject publish request
  async rejectPublishRequest(requestId: number, adminId: number, reason?: string) {
    const request = await this.prisma.flashcardDeckPublishRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    await this.prisma.flashcardDeckPublishRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        message: reason,
      },
    });

    return { message: 'Publish request rejected' };
  }
}
