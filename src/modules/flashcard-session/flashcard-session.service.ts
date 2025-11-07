import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import {
  StartSessionDto,
  StartSessionResponseDto,
  ReviewCardDto,
  ReviewCardResponseDto,
  SessionProgressDto,
  CompleteSessionResponseDto,
  NextCardDto,
  DueCardsQueryDto,
  DueCardsResponseDto,
  StudyStatisticsQueryDto,
  StudyStatisticsResponseDto,
  DeckStatisticsDto,
  CardQuality,
  ReviewType,
  ActiveSessionDto,
} from './dto/flashcard-session.dto';

@Injectable()
export class FlashcardSessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Start a new flashcard study session
   */
  async startSession(
    userId: number,
    dto: StartSessionDto,
  ): Promise<StartSessionResponseDto> {
    const { deckId, maxNewCards = 10, maxReviewCards = 20, reviewType = ReviewType.ALL } = dto;

    // Verify deck exists and user has access
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ userId }, { isPublic: true }],
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found or access denied');
    }

    // Get cards based on review type
    let dueCards: any[] = [];
    let newCards: any[] = [];

    // Get due cards if needed
    if (reviewType === ReviewType.ALL || reviewType === ReviewType.DUE_ONLY) {
      const now = new Date();
      dueCards = await this.prisma.flashcardCard.findMany({
        where: {
          deckId,
          nextReviewAt: { lte: now },
          lastReviewedAt: { not: null }, // Only cards that have been reviewed before
        },
        take: maxReviewCards,
        orderBy: { nextReviewAt: 'asc' },
      });
    }

    // Get new cards if needed
    if (reviewType === ReviewType.ALL || reviewType === ReviewType.NEW_ONLY) {
      newCards = await this.prisma.flashcardCard.findMany({
        where: {
          deckId,
          lastReviewedAt: null,
        },
        take: maxNewCards,
        orderBy: { id: 'asc' },
      });
    }

    const totalCards = dueCards.length + newCards.length;

    if (totalCards === 0) {
      throw new BadRequestException('No cards available for study');
    }

    // Create session
    const session = await this.prisma.flashcardStudySession.create({
      data: {
        userId,
        deckId,
        totalCards,
        cardsReviewed: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        totalTimeSpent: 0,
        startedAt: new Date(),
      },
    });

    // Create session cards (queue)
    const sessionCards = [
      ...dueCards.map((card, index) => ({
        sessionId: session.id,
        cardId: card.id,
        orderIndex: index,
        isNew: false,
      })),
      ...newCards.map((card, index) => ({
        sessionId: session.id,
        cardId: card.id,
        orderIndex: dueCards.length + index,
        isNew: true,
      })),
    ];

    await this.prisma.sessionCard.createMany({
      data: sessionCards,
    });

    return {
      sessionId: session.id,
      deckId: deck.id,
      deckName: deck.name,
      totalCards,
      newCards: newCards.length,
      reviewCards: dueCards.length,
      startedAt: session.startedAt,
    };
  }

  /**
   * Get the next card in the session
   */
  async getNextCard(sessionId: number, userId: number): Promise<NextCardDto> {
    // Verify session belongs to user and is active
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: {
        id: sessionId,
        userId,
        completedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already completed');
    }

    // Get next unreviewed card
    const sessionCard = await this.prisma.sessionCard.findFirst({
      where: {
        sessionId,
        reviewedAt: null,
      },
      orderBy: { orderIndex: 'asc' },
      include: {
        card: {
          include: {
            kanji: true,
          },
        },
      },
    });

    if (!sessionCard) {
      throw new NotFoundException('No more cards in session');
    }

    const { card } = sessionCard;
    const { kanji } = card;

    return {
      cardId: card.id,
      kanjiId: kanji.id,
      character: kanji.character,
      meaning: kanji.meanings || '',
      onyomi: kanji.onyomi || '',
      kunyomi: kanji.kunyomi || '',
      isNew: sessionCard.isNew,
      currentCard: session.cardsReviewed + 1,
      totalCards: session.totalCards,
    };
  }

  /**
   * Review a card using SM-2 spaced repetition algorithm
   */
  async reviewCard(
    sessionId: number,
    cardId: number,
    userId: number,
    dto: ReviewCardDto,
  ): Promise<ReviewCardResponseDto> {
    const { quality, timeSpent = 0 } = dto;

    // Verify session and card
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: {
        id: sessionId,
        userId,
        completedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already completed');
    }

    const sessionCard = await this.prisma.sessionCard.findFirst({
      where: {
        sessionId,
        cardId,
        reviewedAt: null,
      },
      include: {
        card: {
          include: {
            kanji: true,
          },
        },
      },
    });

    if (!sessionCard) {
      throw new NotFoundException('Card not found in session or already reviewed');
    }

    const card = sessionCard.card;
    const isCorrect = quality >= CardQuality.CORRECT_HARD_RECALL;

    // SM-2 Algorithm
    const sm2Result = this.calculateSM2(
      card.easinessFactor,
      card.repetitions,
      card.interval,
      quality,
    );

    // Update card with new SM-2 values
    const updatedCard = await this.prisma.flashcardCard.update({
      where: { id: cardId },
      data: {
        easinessFactor: sm2Result.easinessFactor,
        repetitions: sm2Result.repetitions,
        interval: sm2Result.interval,
        nextReviewAt: sm2Result.nextReviewAt,
        lastReviewedAt: new Date(),
      },
    });

    // Mark session card as reviewed
    await this.prisma.sessionCard.update({
      where: {
        sessionId_cardId: {
          sessionId,
          cardId,
        },
      },
      data: {
        reviewedAt: new Date(),
        quality,
        timeSpent,
        isCorrect,
      },
    });

    // Update session stats
    await this.prisma.flashcardStudySession.update({
      where: { id: sessionId },
      data: {
        cardsReviewed: { increment: 1 },
        correctAnswers: isCorrect ? { increment: 1 } : undefined,
        incorrectAnswers: !isCorrect ? { increment: 1 } : undefined,
        totalTimeSpent: { increment: Math.round(timeSpent) },
      },
    });

    return {
      cardId: updatedCard.id,
      character: card.kanji.character,
      easinessFactor: sm2Result.easinessFactor,
      repetitions: sm2Result.repetitions,
      interval: sm2Result.interval,
      nextReviewAt: sm2Result.nextReviewAt,
      isCorrect,
    };
  }

  /**
   * SM-2 Spaced Repetition Algorithm
   * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
   */
  private calculateSM2(
    currentEF: number,
    currentRepetitions: number,
    currentInterval: number,
    quality: CardQuality,
  ): {
    easinessFactor: number;
    repetitions: number;
    interval: number;
    nextReviewAt: Date;
  } {
    let easinessFactor = currentEF;
    let repetitions = currentRepetitions;
    let interval = currentInterval;

    // Update easiness factor
    easinessFactor = Math.max(
      1.3,
      easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );

    // If quality < 3, reset repetitions
    if (quality < CardQuality.CORRECT_HARD_RECALL) {
      repetitions = 0;
      interval = 1; // Review again in 1 day
    } else {
      repetitions += 1;

      // Calculate new interval
      if (repetitions === 1) {
        interval = 1; // First correct review: 1 day
      } else if (repetitions === 2) {
        interval = 6; // Second correct review: 6 days
      } else {
        // Subsequent reviews: multiply previous interval by EF
        interval = Math.round(interval * easinessFactor);
      }
    }

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return {
      easinessFactor: Math.round(easinessFactor * 100) / 100, // Round to 2 decimals
      repetitions,
      interval,
      nextReviewAt,
    };
  }

  /**
   * Get session progress
   */
  async getSessionProgress(
    sessionId: number,
    userId: number,
  ): Promise<SessionProgressDto> {
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const accuracy =
      session.cardsReviewed > 0
        ? Math.round((session.correctAnswers / session.cardsReviewed) * 100)
        : 0;

    const timeElapsed = Math.round(
      (new Date().getTime() - session.startedAt.getTime()) / 1000,
    );

    return {
      sessionId: session.id,
      totalCards: session.totalCards,
      cardsReviewed: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
      accuracy,
      startedAt: session.startedAt,
      timeElapsed,
    };
  }

  /**
   * Complete the study session
   */
  async completeSession(
    sessionId: number,
    userId: number,
  ): Promise<CompleteSessionResponseDto> {
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: {
        id: sessionId,
        userId,
        completedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already completed');
    }

    // Count mastered cards (repetitions >= 3, meaning they've reached longer intervals)
    const masteredCards = await this.prisma.sessionCard.count({
      where: {
        sessionId,
        isCorrect: true,
        card: {
          repetitions: { gte: 3 },
        },
      },
    });

    const completedAt = new Date();
    const totalTime = Math.round(
      (completedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    // Mark session as completed
    const completedSession = await this.prisma.flashcardStudySession.update({
      where: { id: sessionId },
      data: {
        completedAt,
        completed: true,
        totalTimeSpent: session.totalTimeSpent || totalTime,
      },
    });

    const accuracy =
      session.cardsReviewed > 0
        ? Math.round((session.correctAnswers / session.cardsReviewed) * 100)
        : 0;

    return {
      sessionId: completedSession.id,
      totalCards: session.cardsReviewed,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
      accuracy,
      totalTime,
      cardsMastered: masteredCards,
      completedAt,
    };
  }

  /**
   * Get due cards for a deck
   */
  async getDueCards(
    userId: number,
    dto: DueCardsQueryDto,
  ): Promise<DueCardsResponseDto> {
    const { deckId } = dto;

    // Verify deck exists and user has access
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ userId }, { isPublic: true }],
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found or access denied');
    }

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Count new cards (never studied)
    const newCardsCount = await this.prisma.flashcardCard.count({
      where: {
        deckId,
        lastReviewedAt: null,
      },
    });

    // Count cards due today
    const dueTodayCount = await this.prisma.flashcardCard.count({
      where: {
        deckId,
        nextReviewAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Count overdue cards
    const overdueCount = await this.prisma.flashcardCard.count({
      where: {
        deckId,
        nextReviewAt: { lt: todayStart },
      },
    });

    // Get next review date
    const nextCard = await this.prisma.flashcardCard.findFirst({
      where: {
        deckId,
        nextReviewAt: { gt: todayEnd },
      },
      orderBy: { nextReviewAt: 'asc' },
    });

    const totalDue = dueTodayCount + overdueCount;

    return {
      deckId: deck.id,
      deckName: deck.name,
      totalDue,
      newCards: newCardsCount,
      dueToday: dueTodayCount,
      overdue: overdueCount,
      nextReviewAt: nextCard?.nextReviewAt || null,
    };
  }

  /**
   * Get study statistics
   */
  async getStudyStatistics(
    userId: number,
    dto: StudyStatisticsQueryDto,
  ): Promise<StudyStatisticsResponseDto> {
    const { deckId, days = 7 } = dto;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const whereClause: any = {
      userId,
      startedAt: { gte: startDate },
      completedAt: { not: null },
    };

    if (deckId) {
      whereClause.deckId = deckId;
    }

    // Get all completed sessions in period
    const sessions = await this.prisma.flashcardStudySession.findMany({
      where: whereClause,
      orderBy: { startedAt: 'asc' },
    });

    const totalSessions = sessions.length;
    const totalCardsReviewed = sessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrectAnswers, 0);
    const totalStudyTime = sessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0);

    const accuracy =
      totalCardsReviewed > 0 ? Math.round((totalCorrect / totalCardsReviewed) * 100) : 0;
    const avgSessionTime =
      totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;

    // Count cards mastered in period
    const cardsMastered = await this.prisma.flashcardCard.count({
      where: {
        deckId: deckId || undefined,
        repetitions: { gte: 3 },
        lastReviewedAt: { gte: startDate },
      },
    });

    // Calculate streaks
    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    // Daily breakdown
    const dailyStats = this.generateDailyStats(sessions, days);

    return {
      totalSessions,
      totalCardsReviewed,
      totalCorrect,
      totalIncorrect,
      accuracy,
      totalStudyTime,
      avgSessionTime,
      cardsMastered,
      currentStreak,
      longestStreak,
      dailyStats,
    };
  }

  /**
   * Calculate study streaks
   */
  private async calculateStreaks(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    // Get all completed sessions ordered by date
    const sessions = await this.prisma.flashcardStudySession.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });

    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Extract unique dates
    const uniqueDates = Array.from(
      new Set(
        sessions.map((s) => {
          const d = new Date(s.startedAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      ),
    )
      .sort((a, b) => b - a)
      .map((t) => new Date(t));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if streak is still active (studied today or yesterday)
    const lastStudyDate = uniqueDates[0];
    const isStreakActive =
      lastStudyDate.getTime() === today.getTime() ||
      lastStudyDate.getTime() === yesterday.getTime();

    if (isStreakActive) {
      let expectedDate = new Date(today);
      if (lastStudyDate.getTime() === yesterday.getTime()) {
        expectedDate = yesterday;
      }

      for (const studyDate of uniqueDates) {
        if (studyDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          tempStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }

      longestStreak = tempStreak;
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = Math.round(
        (uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Generate daily statistics breakdown
   */
  private generateDailyStats(
    sessions: any[],
    days: number,
  ): Array<{
    date: string;
    sessions: number;
    cardsReviewed: number;
    accuracy: number;
    studyTime: number;
  }> {
    const dailyMap = new Map<string, any>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, {
        date: dateKey,
        sessions: 0,
        cardsReviewed: 0,
        correct: 0,
        accuracy: 0,
        studyTime: 0,
      });
    }

    // Aggregate session data
    sessions.forEach((session) => {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      const day = dailyMap.get(dateKey);

      if (day) {
        day.sessions++;
        day.cardsReviewed += session.cardsReviewed;
        day.correct += session.correctAnswers;
        day.studyTime += session.totalTimeSpent || 0;
      }
    });

    // Calculate accuracy for each day
    const result = Array.from(dailyMap.values()).map((day) => ({
      date: day.date,
      sessions: day.sessions,
      cardsReviewed: day.cardsReviewed,
      accuracy:
        day.cardsReviewed > 0 ? Math.round((day.correct / day.cardsReviewed) * 100) : 0,
      studyTime: day.studyTime,
    }));

    return result.reverse(); // Oldest to newest
  }

  /**
   * Get deck statistics
   */
  async getDeckStatistics(userId: number, deckId: number): Promise<DeckStatisticsDto> {
    // Verify deck exists and user has access
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        OR: [{ userId }, { isPublic: true }],
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found or access denied');
    }

    const now = new Date();

    // Count cards by status
    const [totalCards, newCards, learningCards, reviewCards, masteredCards] =
      await Promise.all([
        this.prisma.flashcardCard.count({ where: { deckId } }),
        this.prisma.flashcardCard.count({
          where: { deckId, lastReviewedAt: null },
        }),
        this.prisma.flashcardCard.count({
          where: { deckId, interval: { lt: 21 }, lastReviewedAt: { not: null } },
        }),
        this.prisma.flashcardCard.count({
          where: { deckId, interval: { gte: 21, lt: 180 }, lastReviewedAt: { not: null } },
        }),
        this.prisma.flashcardCard.count({
          where: { deckId, interval: { gte: 180 } },
        }),
      ]);

    // Count due cards
    const dueCards = await this.prisma.flashcardCard.count({
      where: {
        deckId,
        nextReviewAt: { lte: now },
      },
    });

    // Calculate average easiness factor
    const cards = await this.prisma.flashcardCard.findMany({
      where: { deckId, lastReviewedAt: { not: null } },
      select: { easinessFactor: true },
    });

    const avgEasinessFactor =
      cards.length > 0
        ? Math.round(
            (cards.reduce((sum, c) => sum + c.easinessFactor, 0) / cards.length) * 100,
          ) / 100
        : 2.5;

    // Get total study time
    const sessions = await this.prisma.flashcardStudySession.findMany({
      where: {
        deckId,
        userId,
        completedAt: { not: null },
      },
      select: { totalTimeSpent: true },
    });

    const totalStudyTime = sessions.reduce((sum, s) => sum + (s.totalTimeSpent || 0), 0);

    // Get last studied date
    const lastSession = await this.prisma.flashcardStudySession.findFirst({
      where: {
        deckId,
        userId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    return {
      deckId: deck.id,
      deckName: deck.name,
      totalCards,
      newCards,
      learningCards,
      reviewCards,
      masteredCards,
      dueCards,
      avgEasinessFactor,
      totalStudyTime,
      lastStudiedAt: lastSession?.completedAt || null,
    };
  }

  /**
   * Get active session for a deck (if any)
   */
  async getActiveSession(
    userId: number,
    deckId: number,
  ): Promise<ActiveSessionDto | null> {
    // Find active session for this deck and user
    const session = await this.prisma.flashcardStudySession.findFirst({
      where: {
        userId,
        deckId,
        completedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    // Calculate cards remaining
    const reviewedCount = await this.prisma.sessionCard.count({
      where: {
        sessionId: session.id,
        reviewedAt: { not: null },
      },
    });

    const cardsRemaining = session.totalCards - reviewedCount;
    const accuracy =
      session.cardsReviewed > 0
        ? (session.correctAnswers / session.cardsReviewed) * 100
        : 0;

    return {
      sessionId: session.id,
      deckId: session.deckId,
      totalCards: session.totalCards,
      cardsReviewed: reviewedCount,
      cardsRemaining,
      startedAt: session.startedAt,
      accuracy: Math.round(accuracy * 10) / 10,
    };
  }
}
