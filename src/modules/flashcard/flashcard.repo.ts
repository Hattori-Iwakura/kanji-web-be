import { Injectable } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';
import { 
  CreateFlashcardDeckDto, 
  UpdateFlashcardDeckDto,
  FlashcardDeckQueryDto 
} from './dtos/flashcard-deck.dto';
import {
  CreateFlashcardCardDto,
  UpdateFlashcardCardDto
} from './dtos/flashcard-card.dto';

@Injectable()
export class FlashcardRepository {
  constructor(private readonly dbClient: DbClient) {}

  // ==================== DECK OPERATIONS ====================
  
  async createDeck(data: CreateFlashcardDeckDto, userId?: number) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardDeck.create({
      data: {
        ...data,
        user_id: userId,
      },
    });
  }

  async findAllDecks(query: FlashcardDeckQueryDto, currentUserId?: number) {
    const { user_id, is_public, search, page = 1, limit = 10 } = query;
    
    const where: any = {};
    const conditions: any[] = [];
    
    // Build visibility filter
    const visibilityCondition: any = {};
    if (currentUserId) {
      // Authenticated: show public decks OR own decks
      visibilityCondition.OR = [
        { is_public: true },
        { user_id: currentUserId }
      ];
    } else {
      // Guest: only public decks
      visibilityCondition.is_public = true;
    }
    conditions.push(visibilityCondition);
    
    // Additional filters from query
    if (user_id !== undefined) {
      conditions.push({ user_id });
    }
    
    if (is_public !== undefined) {
      conditions.push({ is_public });
    }
    
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    // Combine all conditions with AND
    if (conditions.length > 1) {
      where.AND = conditions;
    } else if (conditions.length === 1) {
      Object.assign(where, conditions[0]);
    }

    const skip = (page - 1) * limit;

    // @ts-ignore - Prisma client has these properties at runtime
    const [decks, total] = await Promise.all([
      this.dbClient.flashcardDeck.findMany({
        where,
        skip,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              account: true,
              email: true,
            },
          },
          _count: {
            select: {
              Cards: true,
            },
          },
        },
        orderBy: { create_at: 'desc' },
      }),
      this.dbClient.flashcardDeck.count({ where }),
    ]);

    return {
      data: decks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDeckById(id: number, includeCards = false) {
    const include: any = {
      User: {
        select: {
          id: true,
          account: true,
          email: true,
        },
      },
      _count: {
        select: {
          Cards: true,
        },
      },
    };

    if (includeCards) {
      include.Cards = {
        orderBy: [
          { order_index: 'asc' },
          { id: 'asc' },
        ],
        include: {
          Kanji: true,
        },
      };
    }

    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardDeck.findUnique({
      where: { id },
      include,
    });
  }

  async updateDeck(id: number, data: UpdateFlashcardDeckDto) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardDeck.update({
      where: { id },
      data,
    });
  }

  async deleteDeck(id: number) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardDeck.delete({
      where: { id },
    });
  }

  // ==================== CARD OPERATIONS ====================

  async createCard(deckId: number, data: CreateFlashcardCardDto) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.create({
      data: {
        ...data,
        deck_id: deckId,
      },
      include: {
        Kanji: true,
      },
    });
  }

  async createMultipleCards(deckId: number, cards: CreateFlashcardCardDto[]) {
    const cardsData = cards.map(card => ({
      ...card,
      deck_id: deckId,
    }));

    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.createMany({
      data: cardsData,
    });
  }

  async findCardsByDeckId(deckId: number) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.findMany({
      where: { deck_id: deckId },
      include: {
        Kanji: true,
      },
      orderBy: [
        { order_index: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findCardById(id: number) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.findUnique({
      where: { id },
      include: {
        Kanji: true,
        Deck: true,
      },
    });
  }

  async updateCard(id: number, data: UpdateFlashcardCardDto) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.update({
      where: { id },
      data,
      include: {
        Kanji: true,
      },
    });
  }

  async deleteCard(id: number) {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.delete({
      where: { id },
    });
  }

  async countCardsByDeckId(deckId: number): Promise<number> {
    // @ts-ignore - Prisma client has these properties at runtime
    return this.dbClient.flashcardCard.count({
      where: { deck_id: deckId },
    });
  }
}
