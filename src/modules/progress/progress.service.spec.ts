import { Test, TestingModule } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ProgressPeriod } from './dto/progress.dto';

describe('ProgressService', () => {
  let service: ProgressService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    flashcardStudySession: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    flashcardCard: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    profileImage: 'avatar.jpg',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProgressOverview', () => {
    it('should return complete progress overview for user', async () => {
      // Mock data
      const mockFlashcardSessions = [
        {
          id: 1,
          userId: 1,
          deckId: 1,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          createdAt: new Date(),
        },
      ];

      const mockQuizAttempts = [
        {
          id: 1,
          userId: 1,
          quizId: 1,
          score: 8,
          maxScore: 10,
          correctAnswers: 8,
          totalQuestions: 10,
          timeSpent: 120,
          completed: true,
          createdAt: new Date(),
        },
      ];

      // Setup mocks
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue(
        mockFlashcardSessions,
      );
      mockPrismaService.flashcardStudySession.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue(mockQuizAttempts);
      mockPrismaService.flashcardCard.count.mockResolvedValue(50);

      const result = await service.getProgressOverview(1);

      expect(result).toBeDefined();
      expect(result.username).toBe('Test User');
      expect(result.totalFlashcardSessions).toBe(1);
      expect(result.totalQuizAttempts).toBe(1);
      expect(result.flashcardAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.quizAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.xp).toBeGreaterThanOrEqual(0);
      expect(result.level).toBeGreaterThanOrEqual(1);
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.longestStreak).toBeGreaterThanOrEqual(0);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, name: true, email: true, createdAt: true },
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProgressOverview(999)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle user with no activity', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardStudySession.count.mockResolvedValue(0);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardCard.count.mockResolvedValue(0);

      const result = await service.getProgressOverview(1);

      expect(result.totalFlashcardSessions).toBe(0);
      expect(result.totalQuizAttempts).toBe(0);
      expect(result.flashcardAccuracy).toBe(0);
      expect(result.quizAccuracy).toBe(0);
      expect(result.xp).toBe(0);
      expect(result.level).toBe(1); // Minimum level
    });
  });

  describe('calculateXP', () => {
    it('should calculate XP correctly', () => {
      const xp = service['calculateXP'](10, 5, 20, 7);
      // XP = (sessions * 50) + (quizzes * 100) + (mastered * 200) + (streak * 25)
      // XP = (10 * 50) + (5 * 100) + (20 * 200) + (7 * 25)
      // XP = 500 + 500 + 4000 + 175 = 5175
      expect(xp).toBe(5175);
    });

    it('should handle zero values', () => {
      const xp = service['calculateXP'](0, 0, 0, 0);
      expect(xp).toBe(0);
    });
  });

  describe('calculateLevel', () => {
    it('should calculate level correctly', () => {
      // Level formula: floor(sqrt(XP / 100)) + 1
      expect(service['calculateLevel'](0)).toBe(1); // Min level
      expect(service['calculateLevel'](100)).toBe(2); // sqrt(1) + 1
      expect(service['calculateLevel'](400)).toBe(3); // sqrt(4) + 1
      expect(service['calculateLevel'](900)).toBe(4); // sqrt(9) + 1
      expect(service['calculateLevel'](10000)).toBe(11); // sqrt(100) + 1
    });
  });

  describe('getStartDate', () => {
    it('should return correct start date for each period', () => {
      const now = new Date('2025-10-24T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const dayStart = service['getStartDate'](ProgressPeriod.DAY);
      expect(dayStart.getDate()).toBe(now.getDate());

      const weekStart = service['getStartDate'](ProgressPeriod.WEEK);
      expect(weekStart.getTime()).toBeLessThan(now.getTime());

      const monthStart = service['getStartDate'](ProgressPeriod.MONTH);
      expect(monthStart.getTime()).toBeLessThan(now.getTime());

      const yearStart = service['getStartDate'](ProgressPeriod.YEAR);
      expect(yearStart.getTime()).toBeLessThan(now.getTime());

      const allStart = service['getStartDate'](ProgressPeriod.ALL);
      expect(allStart.getFullYear()).toBe(2000);
    });
  });

  describe('getDaysInPeriod', () => {
    it('should return correct days for each period', () => {
      expect(service['getDaysInPeriod'](ProgressPeriod.DAY)).toBe(1);
      expect(service['getDaysInPeriod'](ProgressPeriod.WEEK)).toBe(7);
      expect(service['getDaysInPeriod'](ProgressPeriod.MONTH)).toBe(30);
      expect(service['getDaysInPeriod'](ProgressPeriod.YEAR)).toBe(365);
      expect(service['getDaysInPeriod'](ProgressPeriod.ALL)).toBe(3650);
    });
  });

  describe('getFlashcardProgress', () => {
    it('should return flashcard progress with deck filter', async () => {
      const mockCards = [
        {
          id: 1,
          deckId: 1,
          kanjiId: 1,
          status: 'review',
          easeFactor: 2.5,
          interval: 7,
          nextReviewAt: new Date(),
        },
      ];

      const mockSessions = [
        {
          id: 1,
          deckId: 1,
          cardsReviewed: 10,
          correctAnswers: 8,
          totalTimeSpent: 300,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.flashcardCard.findMany.mockResolvedValue(mockCards);
      mockPrismaService.flashcardCard.count
        .mockResolvedValueOnce(5) // new
        .mockResolvedValueOnce(3) // learning
        .mockResolvedValueOnce(2) // review
        .mockResolvedValueOnce(1); // mastered
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue(
        mockSessions,
      );

      const result = await service.getFlashcardProgress(1, {
        period: ProgressPeriod.WEEK,
        deckId: 1,
      });

      expect(result).toBeDefined();
      expect(result.deckId).toBe(1);
      expect(result.totalCards).toBeGreaterThanOrEqual(0);
      expect(result.newCards).toBeGreaterThanOrEqual(0);
      expect(result.learningCards).toBeGreaterThanOrEqual(0);
      expect(result.reviewCards).toBeGreaterThanOrEqual(0);
      expect(result.masteredCards).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQuizProgress', () => {
    it('should return quiz progress with accurate metrics', async () => {
      const mockAttempts = [
        {
          id: 1,
          quizId: 1,
          score: 8,
          maxScore: 10,
          correctAnswers: 8,
          totalQuestions: 10,
          timeSpent: 120,
          completed: true,
          createdAt: new Date(),
          quiz: { difficulty: 'medium' },
        },
        {
          id: 2,
          quizId: 1,
          score: 9,
          maxScore: 10,
          correctAnswers: 9,
          totalQuestions: 10,
          timeSpent: 100,
          completed: true,
          createdAt: new Date(),
          quiz: { difficulty: 'medium' },
        },
      ];

      mockPrismaService.quizAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getQuizProgress(1, {
        period: ProgressPeriod.WEEK,
      });

      expect(result).toBeDefined();
      expect(result.totalAttempts).toBe(2);
      expect(result.totalQuestions).toBe(20);
      expect(result.correctAnswers).toBe(17);
      expect(result.incorrectAnswers).toBe(3);
      expect(result.accuracy).toBeGreaterThan(80);
      expect(result.avgScore).toBeGreaterThan(80);
      expect(result.totalTime).toBe(220);
      expect(result.avgTimePerQuiz).toBe(110);
    });
  });

  describe('getStreaks', () => {
    it('should calculate current and longest streaks', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Mock consecutive study days
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([
        { createdAt: today },
        { createdAt: yesterday },
        { createdAt: twoDaysAgo },
      ]);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);

      const result = await service.getStreaks(1);

      expect(result).toBeDefined();
      expect(result.currentStreak).toBeGreaterThanOrEqual(1);
      expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
      expect(result.isActiveToday).toBe(true);
    });

    it('should return zero streaks for inactive user', async () => {
      const longTimeAgo = new Date('2025-01-01');
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([
        { createdAt: longTimeAgo },
      ]);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);

      const result = await service.getStreaks(1);

      expect(result.currentStreak).toBe(0);
      expect(result.isActiveToday).toBe(false);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with current user position', async () => {
      const mockUsers = [
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          profileImage: null,
          passwordHash: 'hash',
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          profileImage: null,
          passwordHash: 'hash',
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUsers[1]);
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([
        { cardsReviewed: 100, correctAnswers: 80, createdAt: new Date() },
      ]);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        {
          score: 8,
          maxScore: 10,
          correctAnswers: 8,
          totalQuestions: 10,
          completed: true,
          createdAt: new Date(),
        },
      ]);
      mockPrismaService.flashcardCard.count.mockResolvedValue(50);

      const result = await service.getLeaderboard(1, {
        type: 'xp',
        period: ProgressPeriod.WEEK,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.entries).toBeInstanceOf(Array);
      expect(result.currentUser).toBeDefined();
    });
  });

  describe('getAchievements', () => {
    it('should return all achievements with progress', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardStudySession.count.mockResolvedValue(0);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardCard.count.mockResolvedValue(0);

      const result = await service.getAchievements(1);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('progress');
      expect(result[0]).toHaveProperty('target');
      expect(result[0]).toHaveProperty('unlocked');
    });

    it('should unlock achievements when target is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.flashcardStudySession.count.mockResolvedValue(10);
      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue([]);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardCard.count.mockResolvedValue(0);

      const result = await service.getAchievements(1);

      const firstSessionAchievement = result.find(
        (a) => a.id === 'flashcard_first_session',
      );
      expect(firstSessionAchievement).toBeDefined();
      expect(firstSessionAchievement?.unlocked).toBe(true);
    });
  });

  describe('getChartData', () => {
    it('should return time-series data for charts', async () => {
      const mockSessions = [
        {
          createdAt: new Date(),
          totalTimeSpent: 300,
          cardsReviewed: 10,
          correctAnswers: 8,
        },
      ];
      const mockAttempts = [
        {
          createdAt: new Date(),
          timeSpent: 120,
          score: 8,
          maxScore: 10,
          correctAnswers: 8,
          totalQuestions: 10,
        },
      ];

      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue(
        mockSessions,
      );
      mockPrismaService.quizAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getChartData(1, {
        period: ProgressPeriod.WEEK,
        dataPoints: 7,
      });

      expect(result).toBeDefined();
      expect(result.labels).toBeInstanceOf(Array);
      expect(result.labels.length).toBe(7);
      expect(result.studyTime).toBeInstanceOf(Array);
      expect(result.cardsStudied).toBeInstanceOf(Array);
      expect(result.quizzesTaken).toBeInstanceOf(Array);
      expect(result.accuracy).toBeInstanceOf(Array);
      expect(result.xpGained).toBeInstanceOf(Array);
    });
  });

  describe('getStudyTime', () => {
    it('should return comprehensive study time analysis', async () => {
      const mockSessions = [
        {
          createdAt: new Date(),
          totalTimeSpent: 300,
        },
      ];
      const mockAttempts = [
        {
          createdAt: new Date(),
          timeSpent: 120,
          completed: true,
        },
      ];

      mockPrismaService.flashcardStudySession.findMany.mockResolvedValue(
        mockSessions,
      );
      mockPrismaService.quizAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getStudyTime(1, {
        period: ProgressPeriod.WEEK,
      });

      expect(result).toBeDefined();
      expect(result.totalTime).toBe(420); // 300 + 120
      expect(result.flashcardTime).toBe(300);
      expect(result.quizTime).toBe(120);
      expect(result.avgDailyTime).toBeGreaterThanOrEqual(0);
      expect(result.avgSessionTime).toBeGreaterThanOrEqual(0);
      expect(result.mostProductiveDay).toBeDefined();
      expect(result.mostProductiveHour).toBeGreaterThanOrEqual(0);
      expect(result.mostProductiveHour).toBeLessThan(24);
    });
  });
});
