import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddCardDto } from './dto/add-card.dto';
import { ReviewCardDto } from './dto/review-card.dto';
import { StartStudyDto, StudySessionMode } from './dto/start-study.dto';
import { DbClient } from '../db_client/db_client.service';

@Injectable()
export class FlashcardRepository {
    constructor(private readonly dbClient: DbClient) {}

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

      const collection = await this.dbClient.kanjiCollections.findFirst({
        where: { id: source_id, user_id: userId },
        include: { KanjiCollectionItems: true },
      });

      if (!collection) {
        throw new NotFoundException('Kanji collection not found');
      }

      // Create deck with cards from collection
      const deck = await this.dbClient.flashcardDeck.create({
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
      const kanjis = await this.dbClient.kanji.findMany({
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

      await this.dbClient.flashcardCard.createMany({
        data: cards,
      });

      return this.getDeckById(deck.id, userId);
    }

    // Create custom deck
    const deck = await this.dbClient.flashcardDeck.create({
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
    const deck = await this.dbClient.flashcardDeck.findFirst({
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
          orderBy: [
            { order_index: 'asc' } as any,
            { create_at: 'asc' },
          ],
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async getUserDecks(userId: number) {
    return this.dbClient.flashcardDeck.findMany({
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
    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    return this.dbClient.flashcardDeck.update({
      where: { id: deckId },
      data: updateDeckDto,
    });
  }

  async deleteDeck(deckId: number, userId: number) {
    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    await this.dbClient.flashcardDeck.delete({
      where: { id: deckId },
    });

    return { message: 'Deck deleted successfully' };
  }

  // ==================== Card Management ====================

  async addCardToDeck(deckId: number, userId: number, addCardDto: AddCardDto) {
    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const kanji = await this.dbClient.kanji.findUnique({
      where: { id: addCardDto.kanji_id },
    });

    if (!kanji) {
      throw new NotFoundException('Kanji not found');
    }

    // Check if card already exists
    const existingCard = await this.dbClient.flashcardCard.findFirst({
      where: {
        deck_id: deckId,
        kanji_id: addCardDto.kanji_id,
      },
    });

    if (existingCard) {
      throw new BadRequestException('Card already exists in this deck');
    }

    const aggregate = await (this.dbClient.flashcardCard.aggregate as any)({
      where: { deck_id: deckId },
      _max: { order_index: true },
    });
    const nextOrderIndex = ((aggregate?._max?.order_index ?? -1) as number) + 1;

    // Create card with kanji data
    const card = await this.dbClient.flashcardCard.create({
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
        order_index: nextOrderIndex,
      } as any,
      include: {
        Kanji: true,
      },
    });

    // Update deck stats
    await this.updateDeckStats(deckId);

    return card;
  }

  async removeCardFromDeck(cardId: number, userId: number) {
    const card = await this.dbClient.flashcardCard.findUnique({
      where: { id: cardId },
      include: {
        Deck: true,
      },
    });

    if (!card || card.Deck.user_id !== userId) {
      throw new NotFoundException('Card not found');
    }

    await this.dbClient.flashcardCard.delete({
      where: { id: cardId },
    });

    // Update deck stats
    await this.updateDeckStats(card.deck_id);

    return { message: 'Card removed successfully' };
  }

  async bulkAddCards(deckId: number, userId: number, kanjiIds: number[]) {
    if (!kanjiIds?.length) {
      throw new BadRequestException('kanjiIds must not be empty');
    }

    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const existing = await this.dbClient.flashcardCard.findMany({
      where: { deck_id: deckId, kanji_id: { in: kanjiIds } },
      select: { kanji_id: true },
    });
    const existingSet = new Set(existing.map((item) => item.kanji_id));
    const newKanjiIds = kanjiIds.filter((id) => !existingSet.has(id));

    if (!newKanjiIds.length) {
      return { message: 'No new cards added' };
    }

    const kanjiData = await this.dbClient.kanji.findMany({
      where: { id: { in: newKanjiIds } },
    });

    if (!kanjiData.length) {
      throw new NotFoundException('Kanji not found for provided ids');
    }

    const aggregate = await (this.dbClient.flashcardCard.aggregate as any)({
      where: { deck_id: deckId },
      _max: { order_index: true },
    });
    const baseOrderIndex = ((aggregate?._max?.order_index ?? -1) as number) + 1;

    await this.dbClient.flashcardCard.createMany({
      data: kanjiData.map((kanji, index) => ({
        deck_id: deckId,
        kanji_id: kanji.id,
        front_content: kanji.character,
        back_content: JSON.stringify({
          meanings: kanji.meanings,
          onyomi: kanji.onyomi,
          kunyomi: kanji.kunyomi,
          jlpt: kanji.jlpt,
        }),
        order_index: baseOrderIndex + index,
      })) as any,
      skipDuplicates: true,
    });

    await this.updateDeckStats(deckId);

    return { message: `Added ${newKanjiIds.length} cards` };
  }

  async reorderCards(deckId: number, userId: number, cardIds: number[]) {
    if (!cardIds?.length) {
      throw new BadRequestException('cardIds must not be empty');
    }

    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: { id: deckId, user_id: userId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const deckCards = await this.dbClient.flashcardCard.findMany({
      where: { deck_id: deckId },
      select: { id: true },
      orderBy: { order_index: 'asc' } as any,
    });

    const deckCardIds = new Set(deckCards.map((card) => card.id));
    const invalidIds = cardIds.filter((id) => !deckCardIds.has(id));

    if (invalidIds.length) {
      throw new BadRequestException('Some cardIds do not belong to this deck');
    }

    const orderedCards = [
      ...cardIds,
      ...deckCards
        .map((card) => card.id)
        .filter((id) => !cardIds.includes(id)),
    ];

    await Promise.all(
      orderedCards.map((id, index) =>
        this.dbClient.flashcardCard.update({
          where: { id },
          data: { order_index: index } as any,
        }),
      ),
    );

    return { message: 'Cards reordered successfully' };
  }

  // ==================== Study Session ====================

  async startStudySession(deckId: number, userId: number, startStudyDto: StartStudyDto) {
    const deck = await this.dbClient.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ user_id: userId }, { is_public: true }],
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const {
      max_cards = 20,
      mode = StudySessionMode.MIXED,
      randomize = false,
      include_new = true,
      include_due = true,
      include_hard = mode === StudySessionMode.HARD,
      difficulty_threshold = 2,
      resume_existing = true,
    } = startStudyDto;

    if (resume_existing) {
      const existing = (await this.dbClient.flashcardStudySession.findFirst({
        where: {
          deck_id: deckId,
          user_id: userId,
          completed: false,
          status: { in: ['ACTIVE', 'PAUSED'] },
        } as any,
        orderBy: { update_at: 'desc' },
      })) as any;

      if (existing) {
        const payload = await this.buildSessionResponse(existing);
        return {
          message: 'Resuming existing study session',
          ...payload,
        };
      }
    }

    const where = this.buildStudyCardFilter(deckId, mode, {
      include_new,
      include_due,
      include_hard,
      difficulty_threshold,
    });

    const findManyArgs: any = {
      where,
      include: { Kanji: true },
    };

    if (!randomize) {
      findManyArgs.orderBy = this.buildStudyOrder(mode, include_hard);
      findManyArgs.take = max_cards;
    } else {
      findManyArgs.orderBy = this.buildStudyOrder(mode, include_hard);
      findManyArgs.take = Math.min(max_cards * 5, 200);
    }

    const candidateCards = await this.dbClient.flashcardCard.findMany(findManyArgs);

    const selectedCards = randomize
      ? this.shuffleArray(candidateCards).slice(0, max_cards)
      : candidateCards.slice(0, max_cards);

    if (!selectedCards.length) {
      return {
        message: 'No cards available for the selected study settings',
        cards: [],
        session: null,
      };
    }

    const cardOrder = selectedCards.map((card) => card.id);

    const session = await this.dbClient.flashcardStudySession.create({
      data: {
        deck_id: deckId,
        user_id: userId,
        cards_total: cardOrder.length,
        current_index: 0,
        card_order: cardOrder as any,
        settings: {
          max_cards,
          mode,
          randomize,
          include_new,
          include_due,
          include_hard,
          difficulty_threshold,
        } as any,
        status: 'ACTIVE',
        completed: false,
      },
    });

    const payload = await this.buildSessionResponse(session, {
      preloadedCards: selectedCards,
    });

    return {
      message: 'Study session started',
      ...payload,
    };
  }

  async reviewCard(
    sessionId: number,
    cardId: number,
    userId: number,
    reviewCardDto: ReviewCardDto,
  ) {
    const session = (await this.dbClient.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    })) as any;

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (session.completed || session.status === 'COMPLETED') {
      throw new BadRequestException('Study session already completed');
    }

    const cardOrder = Array.isArray(session.card_order as any)
      ? (session.card_order as unknown as number[])
      : [];

    if (!cardOrder.length) {
      throw new BadRequestException('Study session has no cards queued');
    }

    const cardIndex = cardOrder.findIndex((id) => id === cardId);

    if (cardIndex === -1) {
      throw new BadRequestException('Card does not belong to this study session');
    }

    const card = await this.dbClient.flashcardCard.findUnique({
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
    await this.dbClient.flashcardCard.update({
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
    await this.dbClient.flashcardReview.create({
      data: {
        card_id: cardId,
        session_id: sessionId,
        rating: reviewCardDto.rating,
        time_spent: reviewCardDto.time_spent,
      },
    });

    // Update session stats
    const isCorrect = reviewCardDto.rating >= 2;
    const currentIndex = session.current_index ?? 0;
    const nextIndex = Math.max(currentIndex, cardIndex + 1);
    const progressed = nextIndex > currentIndex;
    const totalCards = session.cards_total || cardOrder.length;
    const isSessionComplete = progressed && nextIndex >= totalCards;

    const sessionUpdate: Record<string, unknown> = {
      total_time: { increment: reviewCardDto.time_spent },
      status: isSessionComplete ? 'COMPLETED' : 'ACTIVE',
      paused_at: null,
    };

    if (progressed) {
      sessionUpdate['cards_studied'] = { increment: 1 };
      sessionUpdate['current_index'] = nextIndex;
      if (isCorrect) {
        sessionUpdate['cards_correct'] = { increment: 1 };
      } else {
        sessionUpdate['cards_wrong'] = { increment: 1 };
      }
    }

    if (isSessionComplete) {
      sessionUpdate['completed'] = true;
      sessionUpdate['completed_at'] = new Date();
    }

    await this.dbClient.flashcardStudySession.update({
      where: { id: sessionId },
      data: sessionUpdate as any,
    });

    // Update deck stats
    await this.updateDeckStats(card.deck_id);

    return {
      message: 'Review submitted successfully',
      next_review_at,
      interval_days,
    };
  }

  async pauseSession(sessionId: number, userId: number) {
    const session = (await this.dbClient.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    })) as any;

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (session.completed || session.status === 'COMPLETED') {
      throw new BadRequestException('Study session already completed');
    }

    if (session.status === 'PAUSED') {
      const payload = await this.buildSessionResponse(session);
      return { message: 'Study session paused', ...payload };
    }

    const updated = (await this.dbClient.flashcardStudySession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED',
        paused_at: new Date(),
      } as any,
    })) as any;

    const payload = await this.buildSessionResponse(updated);

    return {
      message: 'Study session paused',
      ...payload,
    };
  }

  async resumeSession(sessionId: number, userId: number) {
    const session = (await this.dbClient.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    })) as any;

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (session.completed || session.status === 'COMPLETED') {
      throw new BadRequestException('Study session already completed');
    }

    const current =
      session.status === 'ACTIVE'
        ? session
        : ((await this.dbClient.flashcardStudySession.update({
            where: { id: sessionId },
            data: {
              status: 'ACTIVE',
              paused_at: null,
            } as any,
          })) as any);

    const payload = await this.buildSessionResponse(current);

    return {
      message: 'Study session resumed',
      ...payload,
    };
  }

  async getSessionDetail(sessionId: number, userId: number) {
    const session = (await this.dbClient.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        Deck: { select: { id: true, name: true } },
        Reviews: {
          orderBy: { create_at: 'asc' },
          include: {
            Card: {
              select: {
                id: true,
                front_content: true,
                back_content: true,
                Kanji: { select: { id: true, character: true } },
              },
            },
          },
        },
      },
    })) as any;

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    const payload = await this.buildSessionResponse(session, {
      includeReviewed: true,
    });

    const reviews = (session.Reviews || []).map((review) => ({
      id: review.id,
      cardId: review.card_id,
      rating: review.rating,
      timeSpent: review.time_spent,
      reviewedAt: review.create_at,
      card: review.Card
        ? {
            id: review.Card.id,
            front: review.Card.front_content,
            back: review.Card.back_content,
            kanji: review.Card.Kanji?.character,
          }
        : null,
    }));

    return {
      ...payload,
      deck: session.Deck,
      reviews,
    };
  }

  async getActiveSessions(userId: number, deckId?: number) {
    const sessions = (await this.dbClient.flashcardStudySession.findMany({
      where: {
        user_id: userId,
        completed: false,
        deck_id: deckId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      } as any,
      orderBy: { update_at: 'desc' },
      include: {
        Deck: { select: { id: true, name: true } },
      },
      take: 10,
    })) as any[];

    return Promise.all(
      sessions.map(async (session) => {
        const payload = await this.buildSessionResponse(session);
        return {
          ...payload,
          deck: session.Deck,
        };
      }),
    );
  }

  async completeSession(sessionId: number, userId: number) {
    const session = (await this.dbClient.flashcardStudySession.findFirst({
      where: { id: sessionId, user_id: userId },
    })) as any;

    if (!session) {
      throw new NotFoundException('Study session not found');
    }

    if (session.completed || session.status === 'COMPLETED') {
      return this.buildSessionResponse(session, { includeReviewed: true });
    }

    const totalCards = session.cards_total || (Array.isArray(session.card_order) ? session.card_order.length : session.cards_studied);
    const updated = (await this.dbClient.flashcardStudySession.update({
      where: { id: sessionId },
      data: {
        completed: true,
        status: 'COMPLETED',
        completed_at: new Date(),
        current_index: Math.max(session.current_index ?? 0, totalCards ?? 0),
      } as any,
    })) as any;

    return this.buildSessionResponse(updated, { includeReviewed: true });
  }

  async getStudyHistory(userId: number, deckId?: number) {
    const sessions = await this.dbClient.flashcardStudySession.findMany({
      where: {
        user_id: userId,
        deck_id: deckId,
        status: 'COMPLETED',
      } as any,
      include: {
        Deck: {
          select: { id: true, name: true },
        },
        Reviews: {
          orderBy: { create_at: 'asc' },
          include: {
            Card: {
              select: {
                id: true,
                front_content: true,
                back_content: true,
                Kanji: { select: { id: true, character: true } },
              },
            },
          },
        },
      },
      orderBy: { create_at: 'desc' },
      take: 50,
    });

    return (sessions as any[]).map((session) => {
      const reviews = session.Reviews.map((review) => ({
        id: review.id,
        cardId: review.card_id,
        rating: review.rating,
        timeSpent: review.time_spent,
        reviewedAt: review.create_at,
        card: review.Card
          ? {
              id: review.Card.id,
              front: review.Card.front_content,
              back: review.Card.back_content,
              kanji: review.Card.Kanji?.character,
            }
          : null,
      }));

      const accuracy = session.cards_studied
        ? Math.round((session.cards_correct / Math.max(session.cards_studied, 1)) * 100)
        : 0;

      return {
        id: session.id,
        deck: session.Deck,
        startedAt: session.create_at,
  completedAt: session.completed_at ?? session.update_at,
        stats: {
          cardsStudied: session.cards_studied,
          cardsCorrect: session.cards_correct,
          cardsWrong: session.cards_wrong,
          accuracy,
          totalTime: session.total_time,
        },
        reviews,
      };
    });
  }

  async getCardDetail(cardId: number, userId: number) {
    const card = await this.dbClient.flashcardCard.findFirst({
      where: { id: cardId, Deck: { user_id: userId } },
      include: {
        Kanji: true,
        Reviews: {
          orderBy: { create_at: 'desc' },
          include: { Session: true },
        },
      },
    });
    if (!card) throw new NotFoundException('Card not found');

  const totalReviews = card.Reviews.length;
  const correctReviews = card.Reviews.filter((r) => r.rating >= 2).length;
    const accuracy = totalReviews ? Math.round((correctReviews / totalReviews) * 100) : 0;

    return {
      card,
      stats: {
        totalReviews,
        correctReviews,
        accuracy,
        lastReviewedAt: card.last_reviewed_at,
      },
    };
  }

  async getStats(userId: number, deckId?: number) {
    const whereSession: any = {
      user_id: userId,
      deck_id: deckId,
      status: 'COMPLETED',
    };

    const [sessions, totalCards, cardsReviewed] = await Promise.all([
      this.dbClient.flashcardStudySession.findMany({
        where: whereSession,
        orderBy: { create_at: 'asc' },
        include: { Reviews: true },
      }),
      this.dbClient.flashcardCard.count({
        where: { Deck: { user_id: userId }, deck_id: deckId },
      }),
      this.dbClient.flashcardReview.count({
        where: { Session: { user_id: userId, deck_id: deckId, status: 'COMPLETED' } } as any,
      }),
    ]);

    // streak calculation
  let longestStreak = 0;
  let currentStreak = 0;
    let prevDate: string | null = null;

    const activityMap = new Map<string, number>();

    sessions.forEach((session) => {
      const dateKey = session.create_at.toISOString().split('T')[0];
      activityMap.set(dateKey, (activityMap.get(dateKey) ?? 0) + session.cards_studied);

      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(dateKey);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = dateKey;
    });

    const correctReviews = sessions.reduce((acc, session) => acc + session.cards_correct, 0);
    const wrongReviews = sessions.reduce((acc, session) => acc + session.cards_wrong, 0);
    const accuracy = cardsReviewed ? Math.round((correctReviews / cardsReviewed) * 100) : 0;

    return {
      totalCards,
      cardsReviewed,
      totalCorrect: correctReviews,
      totalWrong: wrongReviews,
      accuracy,
      currentStreak,
      longestStreak,
      activityHeatmap: Array.from(activityMap.entries()).map(([date, value]) => ({
        date,
        value,
      })),
    };
  }

  // ==================== Helper Methods ====================

  private buildStudyCardFilter(
    deckId: number,
    mode: StudySessionMode,
    options: {
      include_new: boolean;
      include_due: boolean;
      include_hard: boolean;
      difficulty_threshold: number;
    },
  ) {
    const now = new Date();
    const base: any = { deck_id: deckId };

    switch (mode) {
      case StudySessionMode.NEW:
        return {
          ...base,
          is_new: true,
        };
      case StudySessionMode.DUE:
        return {
          ...base,
          is_new: false,
          next_review_at: { lte: now },
        };
      case StudySessionMode.HARD:
        return {
          ...base,
          difficulty: { gte: options.difficulty_threshold },
        };
      case StudySessionMode.CUSTOM: {
        const conditions: any[] = [];
        if (options.include_new) {
          conditions.push({ is_new: true });
        }
        if (options.include_due) {
          conditions.push({ is_new: false, next_review_at: { lte: now } });
        }
        if (options.include_hard) {
          conditions.push({ difficulty: { gte: options.difficulty_threshold } });
        }
        if (!conditions.length) {
          conditions.push({ is_new: true });
          conditions.push({ next_review_at: { lte: now } });
        }
        return {
          ...base,
          OR: conditions,
        };
      }
      default:
        return {
          ...base,
          OR: [
            { is_new: true },
            { next_review_at: { lte: now } },
          ],
        };
    }
  }

  private buildStudyOrder(mode: StudySessionMode, includeHard?: boolean) {
    switch (mode) {
      case StudySessionMode.NEW:
        return [{ create_at: 'asc' } as any];
      case StudySessionMode.DUE:
        return [{ next_review_at: 'asc' } as any];
      case StudySessionMode.HARD:
        return [
          { difficulty: 'desc' } as any,
          { next_review_at: 'asc' } as any,
        ];
      default: {
        const order: any[] = [
          { is_new: 'desc' },
          { next_review_at: 'asc' },
          { order_index: 'asc' },
        ];
        if (includeHard) {
          order.unshift({ difficulty: 'desc' } as any);
        }
        return order;
      }
    }
  }

  private shuffleArray<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private async buildSessionResponse(
    session: any,
    options: { includeReviewed?: boolean; preloadedCards?: any[] } = {},
  ) {
    const { includeReviewed = false, preloadedCards } = options;
    const cardOrder = Array.isArray(session.card_order as any)
      ? (session.card_order as number[])
      : [];

    const totalCards = session.cards_total || cardOrder.length || 0;
    const currentIndex = session.current_index ?? 0;
    const startIndex = includeReviewed ? 0 : currentIndex;

    if (!cardOrder.length) {
      return {
        session,
        cards: [],
        meta: {
          totalCards,
          reviewed: Math.min(currentIndex, totalCards),
          remaining: Math.max(totalCards - Math.min(currentIndex, totalCards), 0),
          progress: totalCards ? Math.min(currentIndex, totalCards) / totalCards : 0,
        },
      };
    }

    const cards =
      preloadedCards ??
      (await this.dbClient.flashcardCard.findMany({
        where: { id: { in: cardOrder } },
        include: { Kanji: true },
      }));

    const cardMap = new Map(cards.map((card) => [card.id, card]));
    const orderedCards = cardOrder
      .map((id) => cardMap.get(id))
      .filter((card) => !!card);

    const visibleCards = orderedCards.slice(startIndex);

    return {
      session,
      cards: includeReviewed ? orderedCards : visibleCards,
      meta: {
        totalCards,
        reviewed: Math.min(currentIndex, totalCards),
        remaining: Math.max(totalCards - Math.min(currentIndex, totalCards), 0),
        progress: totalCards ? Math.min(currentIndex, totalCards) / totalCards : 0,
      },
    };
  }

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
      this.dbClient.flashcardCard.count({
        where: { deck_id: deckId },
      }),
      this.dbClient.flashcardCard.count({
        where: { deck_id: deckId, is_new: true },
      }),
      this.dbClient.flashcardCard.count({
        where: {
          deck_id: deckId,
          is_new: false,
          next_review_at: { lte: now },
        },
      }),
    ]);

    await this.dbClient.flashcardDeck.update({
      where: { id: deckId },
      data: {
        total_cards,
        cards_new,
        cards_due,
      },
    });
  }
}
