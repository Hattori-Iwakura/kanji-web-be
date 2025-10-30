import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardSessionService } from './flashcard-session.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FlashcardSessionService', () => {
  let service: FlashcardSessionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    flashcardStudySession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    flashcardDeck: {
      findUnique: jest.fn(),
    },
    flashcardCard: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    flashcardReview: {
      create: jest.fn(),
    },
    sessionCard: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
  };

  const mockDeck = {
    id: 1,
    name: 'JLPT N5 Kanji',
    userId: 1,
    isPublic: true,
  };

  const mockCard = {
    id: 1,
    deckId: 1,
    kanjiId: 1,
    front: '日',
    back: 'day, sun',
    difficulty: 0,
    easinessFactor: 2.5,
    repetitions: 0,
    interval: 0,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
  };

  const mockSession = {
    id: 1,
    userId: 1,
    deckId: 1,
    totalCards: 10,
    cardsReviewed: 0,
    correct: 0,
    wrong: 0,
    studied: 0,
    totalTime: 0,
    averageAccuracy: 0,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardSessionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardSessionService>(FlashcardSessionService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startSession', () => {
    it('should start a new study session successfully', async () => {
      const cards = [mockCard, { ...mockCard, id: 2 }];
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardCard.findMany.mockResolvedValue(cards);
      mockPrismaService.flashcardStudySession.create.mockResolvedValue({
        ...mockSession,
        totalCards: cards.length,
      });

      const result = await service.startSession(mockUser.id, mockDeck.id, 'ALL');

      expect(result).toBeDefined();
      expect(result.totalCards).toBe(2);
      expect(mockPrismaService.flashcardDeck.findUnique).toHaveBeenCalledWith({
        where: { id: mockDeck.id },
      });
      expect(mockPrismaService.flashcardCard.findMany).toHaveBeenCalled();
      expect(mockPrismaService.flashcardStudySession.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if deck does not exist', async () => {
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(null);

      await expect(
        service.startSession(mockUser.id, 999, 'ALL'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if deck is empty', async () => {
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardCard.findMany.mockResolvedValue([]);

      await expect(
        service.startSession(mockUser.id, mockDeck.id, 'ALL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter cards by nextReviewAt for DUE review type', async () => {
      const now = new Date();
      const dueCard = { ...mockCard, nextReviewAt: new Date(now.getTime() - 1000) };
      const futureCard = { ...mockCard, id: 2, nextReviewAt: new Date(now.getTime() + 86400000) };
      
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardCard.findMany.mockResolvedValue([dueCard, futureCard]);
      mockPrismaService.flashcardStudySession.create.mockResolvedValue(mockSession);

      await service.startSession(mockUser.id, mockDeck.id, 'DUE');

      const findManyCall = mockPrismaService.flashcardCard.findMany.mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('nextReviewAt');
    });

    it('should return only NEW cards for NEW review type', async () => {
      const newCard = { ...mockCard, repetitions: 0 };
      const reviewedCard = { ...mockCard, id: 2, repetitions: 3 };
      
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardCard.findMany.mockResolvedValue([newCard, reviewedCard]);
      mockPrismaService.flashcardStudySession.create.mockResolvedValue(mockSession);

      await service.startSession(mockUser.id, mockDeck.id, 'NEW');

      const findManyCall = mockPrismaService.flashcardCard.findMany.mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('repetitions');
    });
  });

  describe('getSession', () => {
    it('should return session details with cards', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue({
        ...mockSession,
        deck: mockDeck,
      });

      const result = await service.getSession(mockSession.id, mockUser.id);

      expect(result).toBeDefined();
      expect(result.deck).toBeDefined();
      expect(mockPrismaService.flashcardStudySession.findUnique).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(null);

      await expect(service.getSession(999, mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if session belongs to another user', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue({
        ...mockSession,
        userId: 2, // Different user
      });

      await expect(service.getSession(mockSession.id, mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reviewCard', () => {
    it('should update card with SM-2 algorithm for correct answer', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.update.mockResolvedValue({
        ...mockCard,
        repetitions: 1,
        interval: 1,
        easinessFactor: 2.6,
      });
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      const result = await service.reviewCard(
        mockSession.id,
        mockCard.id,
        mockUser.id,
        5, // Perfect recall
      );

      expect(result).toBeDefined();
      expect(result.repetitions).toBeGreaterThan(mockCard.repetitions);
      expect(result.interval).toBeGreaterThan(mockCard.interval);
      expect(mockPrismaService.flashcardCard.update).toHaveBeenCalled();
      expect(mockPrismaService.flashcardReview.create).toHaveBeenCalled();
    });

    it('should reset repetitions for incorrect answer (quality < 3)', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue({
        ...mockCard,
        repetitions: 3,
        interval: 7,
      });
      mockPrismaService.flashcardCard.update.mockResolvedValue({
        ...mockCard,
        repetitions: 0,
        interval: 1,
      });
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      const result = await service.reviewCard(
        mockSession.id,
        mockCard.id,
        mockUser.id,
        2, // Incorrect
      );

      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('should calculate correct easinessFactor based on quality', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      // Quality 5 should increase easinessFactor
      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 5);
      
      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      const newEaseFactor = updateCall.data.easinessFactor;
      
      // EF formula: EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      // For q=5: EF + 0.1 = 2.6
      expect(newEaseFactor).toBeGreaterThan(mockCard.easinessFactor);
    });

    it('should enforce minimum easinessFactor of 1.3', async () => {
      const cardWithLowEF = { ...mockCard, easinessFactor: 1.4 };
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(cardWithLowEF);
      mockPrismaService.flashcardCard.update.mockResolvedValue(cardWithLowEF);
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 0);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate interval progression correctly', async () => {
      const cardWithReps = { ...mockCard, repetitions: 2, interval: 2, easinessFactor: 2.5 };
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(cardWithReps);
      mockPrismaService.flashcardCard.update.mockResolvedValue(cardWithReps);
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 4);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      const newInterval = updateCall.data.interval;
      
      // For repetition > 1: interval = previous interval * EF
      // 2 * 2.5 = 5
      expect(newInterval).toBeGreaterThan(cardWithReps.interval);
    });

    it('should set nextReviewAt based on new interval', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);
      mockPrismaService.flashcardReview.create.mockResolvedValue({});

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 4);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('nextReviewAt');
      expect(updateCall.data.nextReviewAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewCard(999, mockCard.id, mockUser.id, 4),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if card does not exist', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewCard(mockSession.id, 999, mockUser.id, 4),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session is completed', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue({
        ...mockSession,
        completed: true,
      });

      await expect(
        service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 4),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeSession', () => {
    it('should complete session and return statistics', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardReview.findMany.mockResolvedValue([
        { quality: 5 },
        { quality: 4 },
        { quality: 3 },
        { quality: 2 },
      ]);
      mockPrismaService.flashcardStudySession.update.mockResolvedValue({
        ...mockSession,
        completed: true,
        cardsReviewed: 4,
        correct: 3,
        wrong: 1,
      });

      const result = await service.completeSession(mockSession.id, mockUser.id);

      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalCards).toBeDefined();
      expect(result.statistics.correctCards).toBeDefined();
      expect(result.statistics.incorrectCards).toBeDefined();
      expect(result.statistics.accuracy).toBeDefined();
      expect(result.completed).toBe(true);
      expect(mockPrismaService.flashcardStudySession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({ completed: true }),
      });
    });

    it('should calculate accuracy correctly', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardReview.findMany.mockResolvedValue([
        { quality: 5 },
        { quality: 4 },
        { quality: 2 },
        { quality: 1 },
        { quality: 5 },
      ]);
      mockPrismaService.flashcardStudySession.update.mockResolvedValue({
        ...mockSession,
        completed: true,
      });

      const result = await service.completeSession(mockSession.id, mockUser.id);

      // 3 correct (quality >= 3) out of 5 = 60%
      expect(result.statistics.accuracy).toBeCloseTo(60, 1);
    });

    it('should handle session with no reviews', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardReview.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardStudySession.update.mockResolvedValue({
        ...mockSession,
        completed: true,
      });

      const result = await service.completeSession(mockSession.id, mockUser.id);

      expect(result.statistics.totalCards).toBe(0);
      expect(result.statistics.accuracy).toBe(0);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(null);

      await expect(
        service.completeSession(999, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session already completed', async () => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue({
        ...mockSession,
        completed: true,
      });

      await expect(
        service.completeSession(mockSession.id, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSessions', () => {
    it('should return all sessions for a user', async () => {
      const sessions = [mockSession, { ...mockSession, id: 2 }];
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue(sessions);

      const result = await service.getUserSessions(mockUser.id);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.flashcardStudySession.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no sessions', async () => {
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([]);

      const result = await service.getUserSessions(mockUser.id);

      expect(result).toEqual([]);
    });

    it('should include deck information in sessions', async () => {
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([
        { ...mockSession, deck: mockDeck },
      ]);

      const result = await service.getUserSessions(mockUser.id);

      expect(result[0]).toHaveProperty('deck');
    });
  });

  describe('SM-2 Algorithm Edge Cases', () => {
    beforeEach(() => {
      mockPrismaService.flashcardStudySession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.flashcardReview.create.mockResolvedValue({});
    });

    it('should handle first repetition (interval = 1)', async () => {
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue({
        ...mockCard,
        repetitions: 0,
      });
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 4);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.interval).toBe(1);
      expect(updateCall.data.repetitions).toBe(1);
    });

    it('should handle second repetition (interval = 6)', async () => {
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue({
        ...mockCard,
        repetitions: 1,
        interval: 1,
      });
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 4);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.interval).toBe(6);
      expect(updateCall.data.repetitions).toBe(2);
    });

    it('should handle quality rating of 0', async () => {
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 0);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.repetitions).toBe(0);
      expect(updateCall.data.interval).toBe(1);
    });

    it('should handle quality rating of 5 (perfect)', async () => {
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 5);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.easinessFactor).toBeGreaterThan(mockCard.easinessFactor);
    });

    it('should handle very high repetition count', async () => {
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue({
        ...mockCard,
        repetitions: 50,
        interval: 365,
        easinessFactor: 2.8,
      });
      mockPrismaService.flashcardCard.update.mockResolvedValue(mockCard);

      await service.reviewCard(mockSession.id, mockCard.id, mockUser.id, 5);

      const updateCall = mockPrismaService.flashcardCard.update.mock.calls[0][0];
      expect(updateCall.data.repetitions).toBe(51);
      expect(updateCall.data.interval).toBeGreaterThan(365);
    });
  });
});
