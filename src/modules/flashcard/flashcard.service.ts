import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddCardDto } from './dto/add-card.dto';
import { ReviewCardDto } from './dto/review-card.dto';
import { StartStudyDto } from './dto/start-study.dto';

@Injectable()
export class FlashcardService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ==================== Deck Management ====================

  async createDeck(userId: number, createDeckDto: CreateDeckDto) {
    const { name, description, source_type, source_id, is_public } =
      createDeckDto;

    // Validate source_id if source_type is kanji_list
    if (source_type === 'kanji_list') {
      if (!source_id) {
        throw new BadRequestException(
          'source_id is required when source_type is kanji_list',
        );
      }

      const collection = await this.prisma.kanjiCollections.findFirst({
        where: { id: source_id, user_id: userId },
        include: { KanjiCollectionItems: true },
      });

      if (!collection) {
        throw new NotFoundException('Kanji collection not found');
      }

      // Create deck with cards from collection
      const deck = await this.prisma.flashcardDeck.create({
        data: {
          name,
          description,
          user_id: userId,
          source_type,
          source_id,
          is_public: is_public ?? false,
          total_cards: collection.KanjiCollectionItems.length,
          cards_new: collection.KanjiCollectionItems.length,
        },
      });

      // Get kanji data for each card
      const kanjiIds = collection.KanjiCollectionItems.map((item) => item.kanji_id);
      const kanjis = await this.prisma.kanji.findMany({
        where: { id: { in: kanjiIds } },
      });

      const kanjiMap = new Map(kanjis.map((k) => [k.id, k]));

      // Create cards for each kanji in collection
      const cards = collection.KanjiCollectionItems.map((item) => {
        const kanji = kanjiMap.get(item.kanji_id);
        return {
          deck_id: deck.id,
          kanji_id: item.kanji_id,
          front_content: kanji?.character || '',
          back_content: JSON.stringify({
            meanings: kanji?.meanings,
            onyomi: kanji?.onyomi,
            kunyomi: kanji?.kunyomi,
            jlpt: kanji?.jlpt,
          }),
        };
      });

      await this.prisma.flashcardCard.createMany({
        data: cards,
      });

      return this.getDeckById(deck.id, userId);
    }

    // Create custom deck
    const deck = await this.prisma.flashcardDeck.create({
      data: {
        name,
        description,
        user_id: userId,
        source_type: 'custom',
        is_public: is_public ?? false,
      },
    });

    return deck;
  }

  async getDeckById(deckId: number, userId: number) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ user_id: userId }, { is_public: true }],
      },
      include: {
        User: {
          select: { id: true, email: true },
        },
        Cards: {
          include: {
            Kanji: true,
          },
          orderBy: { create_at: 'asc' },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async getUserDecks(userId: number) {
    return this.prisma.flashcardDeck.findMany({
      where: { user_id: userId },
      include: {
        Cards: {
          select: { id: true, is_new: true, next_review_at: true },
        },
      },
      orderBy: { update_at: 'desc' },
    });
  }

  async updateDeck(deckId: number, userId: number, updateDeckDto: UpdateDeckDto) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: updateDeckDto,
    });
  }

  async deleteDeck(deckId: number, userId: number) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    await this.prisma.flashcardDeck.delete({
      where: { id: deckId },
    });

    return { message: 'Deck deleted successfully' };
  }

  // ==================== Card Management ====================

  async addCardToDeck(deckId: number, userId: number, addCardDto: AddCardDto) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const kanji = await this.prisma.kanji.findUnique({
      where: { id: addCardDto.kanji_id },
    });

    if (!kanji) {
      throw new NotFoundException('Kanji not found');
    }

    // Check if card already exists
    const existingCard = await this.prisma.flashcardCard.findFirst({
      where: {
        deck_id: deckId,
        kanji_id: addCardDto.kanji_id,
      },
    });

    if (existingCard) {
      throw new BadRequestException('Card already exists in this deck');
    }

    // Create card with kanji data
    const card = await this.prisma.flashcardCard.create({
      data: {
        deck_id: deckId,
        kanji_id: addCardDto.kanji_id,
        front_content: kanji.character,
        back_content: JSON.stringify({
          meanings: kanji.meanings,
          onyomi: kanji.onyomi,
          kunyomi: kanji.kunyomi,
          jlpt: kanji.jlpt,
        }),
      },
      include: {
        Kanji: true,
      },
    });

    // Update deck stats
    await this.updateDeckStats(deckId);

    return card;
  }

  async removeCardFromDeck(cardId: number, userId: number) {
    const card = await this.prisma.flashcardCard.findUnique({
      where: { id: cardId },
      include: {
        Deck: true,
      },
    });

    if (!card || card.Deck.user_id !== userId) {
      throw new NotFoundException('Card not found');
    }

    await this.prisma.flashcardCard.delete({
      where: { id: cardId },
    });

    // Update deck stats
    await this.updateDeckStats(card.deck_id);

    return { message: 'Card removed successfully' };
  }

  // ==================== Study Session ====================

  async startStudySession(deckId: number, userId: number, startStudyDto: StartStudyDto) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ user_id: userId }, { is_public: true }],
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Get due cards (new cards + cards due for review)
    const dueCards = await this.prisma.flashcardCard.findMany({
      where: {
        deck_id: deckId,
        OR: [
          { is_new: true },
          { next_review_at: { lte: new Date() } },
        ],
      },
      include: {
        Kanji: true,
      },
      take: startStudyDto.max_cards || 20,
      orderBy: [
        { is_new: 'desc' }, // New cards first
        { next_review_at: 'asc' }, // Then oldest due cards
      ],
    });

    if (dueCards.length === 0) {
      return {
        message: 'No cards due for review',
        cards: [],
        session: null,
      };
    }

    // Create study session
    const session = await this.prisma.flashcardStudySession.create({
      data: {
        deck_id: deckId,
        user_id: userId,
      },
    });

    return {
      session,
      cards: dueCards,
    };
  }

  async reviewCard(
    sessionId: number,
    cardId: number,
    userId: number,
    reviewCardDto: ReviewCardDto,
  ) {
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    const card = await this.prisma.flashcardCard.findUnique({
      where: { id: cardId },
    });

    if (!card || card.deck_id !== session.deck_id) {
      throw new NotFoundException('Card not found');
    }

    // Calculate new values using SM-2 algorithm
    const { interval_days, ease_factor, repetitions, is_new } =
      this.calculateSM2(
        card.interval_days,
        card.ease_factor,
        card.repetitions,
        reviewCardDto.rating,
      );

    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval_days);

    // Update card
    await this.prisma.flashcardCard.update({
      where: { id: cardId },
      data: {
        interval_days,
        ease_factor,
        repetitions,
        next_review_at,
        is_new,
        last_reviewed_at: new Date(),
        difficulty: reviewCardDto.rating <= 1 ? card.difficulty + 1 : Math.max(0, card.difficulty - 1),
      },
    });

    // Create review record
    await this.prisma.flashcardReview.create({
      data: {
        card_id: cardId,
        session_id: sessionId,
        rating: reviewCardDto.rating,
        time_spent: reviewCardDto.time_spent,
      },
    });

    // Update session stats
    const isCorrect = reviewCardDto.rating >= 2;
    await this.prisma.flashcardStudySession.update({
      where: { id: sessionId },
      data: {
        cards_studied: { increment: 1 },
        cards_correct: isCorrect ? { increment: 1 } : undefined,
        cards_wrong: !isCorrect ? { increment: 1 } : undefined,
        total_time: { increment: reviewCardDto.time_spent },
      },
    });

    // Update deck stats
    await this.updateDeckStats(card.deck_id);

    return {
      message: 'Review submitted successfully',
      next_review_at,
      interval_days,
    };
  }

  async completeSession(sessionId: number, userId: number) {
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    return this.prisma.flashcardStudySession.update({
      where: { id: sessionId },
      data: { completed: true },
    });
  }

  async getStudyHistory(userId: number, deckId?: number) {
    return this.prisma.flashcardStudySession.findMany({
      where: {
        user_id: userId,
        deck_id: deckId,
        completed: true,
      },
      include: {
        Deck: {
          select: { id: true, name: true },
        },
        Reviews: {
          include: {
            Card: {
              include: {
                Kanji: {
                  select: { id: true, character: true },
                },
              },
            },
          },
        },
      },
      orderBy: { create_at: 'desc' },
      take: 50,
    });
  }

  // ==================== Helper Methods ====================

  /**
   * SM-2 Spaced Repetition Algorithm
   * @param current_interval Current interval in days
   * @param current_ease Current ease factor
   * @param current_reps Current repetition count
   * @param rating User rating (0-5)
   * @returns Updated values for interval, ease factor, and repetitions
   */
  private calculateSM2(
    current_interval: number,
    current_ease: number,
    current_reps: number,
    rating: number,
  ) {
    let ease_factor = current_ease;
    let interval_days = current_interval;
    let repetitions = current_reps;
    let is_new = false;

    // If rating < 2, reset the card (failed)
    if (rating < 2) {
      repetitions = 0;
      interval_days = 1;
      is_new = false;
    } else {
      // Update ease factor (minimum 1.3)
      ease_factor = Math.max(
        1.3,
        ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)),
      );

      repetitions += 1;

      // Calculate new interval
      if (repetitions === 1) {
        interval_days = 1;
      } else if (repetitions === 2) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }

      is_new = false;
    }

    return { interval_days, ease_factor, repetitions, is_new };
  }

  /**
   * Update deck statistics (total_cards, cards_due, cards_new)
   */
  private async updateDeckStats(deckId: number) {
    const now = new Date();

    const [total_cards, cards_new, cards_due] = await Promise.all([
      this.prisma.flashcardCard.count({
        where: { deck_id: deckId },
      }),
      this.prisma.flashcardCard.count({
        where: { deck_id: deckId, is_new: true },
      }),
      this.prisma.flashcardCard.count({
        where: {
          deck_id: deckId,
          is_new: false,
          next_review_at: { lte: now },
        },
      }),
    ]);

    await this.prisma.flashcardDeck.update({
      where: { id: deckId },
      data: {
        total_cards,
        cards_new,
        cards_due,
      },
    });
  }
}
