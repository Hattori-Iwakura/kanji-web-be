import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import {
  ProgressOverviewDto,
  FlashcardProgressQueryDto,
  FlashcardProgressDto,
  QuizProgressQueryDto,
  QuizProgressDto,
  StreakDto,
  LeaderboardQueryDto,
  LeaderboardDto,
  LeaderboardEntryDto,
  AchievementsDto,
  AchievementDto,
  ChartDataQueryDto,
  ChartDataDto,
  StudyTimeQueryDto,
  StudyTimeDto,
  ProgressPeriod,
} from './dto/progress.dto';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive progress overview for a user
   */
  async getProgressOverview(userId: number): Promise<ProgressOverviewDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get flashcard statistics
    const flashcardSessions = await this.prisma.flashcardStudySession.findMany({
      where: {
        userId,
        completed: true,
      },
    });

    const totalFlashcardSessions = flashcardSessions.length;
    const flashcardCorrect = flashcardSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const flashcardTotal = flashcardSessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
    const flashcardAccuracy = flashcardTotal > 0 ? Math.round((flashcardCorrect / flashcardTotal) * 100) : 0;

    // Get quiz statistics - need to aggregate from QuizAnswer
    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        userId,
        completed: true,
      },
    });

    const totalQuizAttempts = quizAttempts.length;
    const quizCorrect = quizAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const quizTotal = quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const quizAccuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    // Calculate total study time
    const flashcardTime = flashcardSessions.reduce((sum, s) => sum + s.totalTimeSpent, 0);
    const quizTime = quizAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const totalStudyTime = flashcardTime + quizTime;

    // Count kanji mastered (cards with interval >= 180 days)
    const kanjiMastered = await this.prisma.flashcardCard.count({
      where: {
        deck: { userId },
        interval: { gte: 180 },
      },
    });

    // Calculate XP and level (simple formula)
    const xp = this.calculateXP(totalFlashcardSessions, totalQuizAttempts, kanjiMastered, currentStreak);
    const level = this.calculateLevel(xp);

    // Count achievements (placeholder - will implement full system)
    const achievements = Math.floor(xp / 1000); // 1 achievement per 1000 XP

    return {
      userId: user.id,
      username: user.name || user.email.split('@')[0], // Use name or email prefix
      currentStreak,
      longestStreak,
      totalStudyTime,
      totalFlashcardSessions,
      totalQuizAttempts,
      flashcardAccuracy,
      quizAccuracy,
      kanjiMastered,
      achievements,
      level,
      xp,
      lastActive: user.updatedAt,
    };
  }

  /**
   * Get detailed flashcard progress
   */
  async getFlashcardProgress(
    userId: number,
    query: FlashcardProgressQueryDto,
  ): Promise<FlashcardProgressDto> {
    const { period = ProgressPeriod.WEEK, deckId } = query;
    const startDate = this.getStartDate(period);

    const whereClause: any = {
      deck: { userId },
    };

    if (deckId) {
      whereClause.deckId = deckId;
    }

    // Get all user's cards
    const [totalCards, newCards, learningCards, reviewCards, masteredCards] = await Promise.all([
      this.prisma.flashcardCard.count({ where: whereClause }),
      this.prisma.flashcardCard.count({
        where: { ...whereClause, lastReviewedAt: null },
      }),
      this.prisma.flashcardCard.count({
        where: { ...whereClause, interval: { lt: 21 }, lastReviewedAt: { not: null } },
      }),
      this.prisma.flashcardCard.count({
        where: { ...whereClause, interval: { gte: 21, lt: 180 }, lastReviewedAt: { not: null } },
      }),
      this.prisma.flashcardCard.count({
        where: { ...whereClause, interval: { gte: 180 } },
      }),
    ]);

    // Get sessions in period
    const sessionWhereClause: any = {
      userId,
      completed: true,
      createdAt: { gte: startDate },
    };

    if (deckId) {
      sessionWhereClause.deckId = deckId;
    }

    const sessions = await this.prisma.flashcardStudySession.findMany({
      where: sessionWhereClause,
    });

    const totalSessions = sessions.length;
    const correctReviews = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const incorrectReviews = sessions.reduce((sum, s) => sum + s.incorrectAnswers, 0);
    const totalReviews = correctReviews + incorrectReviews;
    const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

    // Calculate average easiness factor
    const cards = await this.prisma.flashcardCard.findMany({
      where: { ...whereClause, lastReviewedAt: { not: null } },
      select: { easinessFactor: true },
    });

    const avgEasinessFactor =
      cards.length > 0
        ? Math.round((cards.reduce((sum, c) => sum + c.easinessFactor, 0) / cards.length) * 100) / 100
        : 2.5;

    const totalStudyTime = sessions.reduce((sum, s) => sum + s.totalTimeSpent, 0);
    const avgSessionTime = totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;

    const daysInPeriod = this.getDaysInPeriod(period);
    const reviewsPerDay = daysInPeriod > 0 ? Math.round((totalReviews / daysInPeriod) * 10) / 10 : 0;

    return {
      totalCardsStudied: totalCards - newCards,
      cardsMastered: masteredCards,
      cardsInReview: reviewCards,
      cardsLearning: learningCards,
      newCards,
      totalSessions,
      correctReviews,
      incorrectReviews,
      accuracy,
      avgEasinessFactor,
      totalStudyTime,
      avgSessionTime,
      reviewsPerDay,
    };
  }

  /**
   * Get detailed quiz progress
   */
  async getQuizProgress(userId: number, query: QuizProgressQueryDto): Promise<QuizProgressDto> {
    const { period = ProgressPeriod.WEEK, quizId } = query;
    const startDate = this.getStartDate(period);

    const whereClause: any = {
      userId,
      completed: true,
      createdAt: { gte: startDate },
    };

    if (quizId) {
      whereClause.quizId = quizId;
    }

    const attempts = await this.prisma.quizAttempt.findMany({
      where: whereClause,
      include: {
        quiz: {
          select: { difficulty: true },
        },
      },
    });

    const totalAttempts = attempts.length;
    const quizzesCompleted = new Set(attempts.map((a) => a.quizId)).size;
    
    // Calculate from new fields
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const correctAnswers = attempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const incorrectAnswers = totalQuestions - correctAnswers;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Calculate scores from maxScore
    const scores = attempts.map((a) => 
      a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0
    );
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const totalTime = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const avgTimePerQuiz = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : 0;

    // Group by difficulty
    const difficultyMap = new Map<string, { attempts: number; correct: number; total: number }>();

    attempts.forEach((attempt) => {
      const difficulty = attempt.quiz.difficulty;
      const existing = difficultyMap.get(difficulty) || { attempts: 0, correct: 0, total: 0 };
      existing.attempts += 1;
      existing.correct += attempt.correctAnswers;
      existing.total += attempt.totalQuestions;
      difficultyMap.set(difficulty, existing);
    });

    const byDifficulty = Array.from(difficultyMap.entries()).map(([difficulty, stats]) => ({
      difficulty,
      attempts: stats.attempts,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));

    return {
      totalAttempts,
      quizzesCompleted,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      accuracy,
      avgScore,
      bestScore,
      totalTime,
      avgTimePerQuiz,
      byDifficulty,
    };
  }

  /**
   * Get streak information
   */
  async getStreaks(userId: number): Promise<StreakDto> {
    const { currentStreak, longestStreak, streakDates, isActive, lastStudyDate } =
      await this.calculateStreaksDetailed(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const daysThisWeek = streakDates.filter((d) => d >= thisWeekStart).length;
    const daysThisMonth = streakDates.filter((d) => d >= thisMonthStart).length;

    return {
      currentStreak,
      longestStreak,
      isActive,
      lastStudyDate,
      streakDates,
      totalStudyDays: streakDates.length,
      daysThisWeek,
      daysThisMonth,
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(userId: number, query: LeaderboardQueryDto): Promise<LeaderboardDto> {
    const { period = ProgressPeriod.WEEK, limit = 10, type = 'xp' } = query;
    const startDate = this.getStartDate(period);

    // Get all users with their stats
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true, // avatar
      },
    });

    // Calculate stats for each user
    const userStats = await Promise.all(
      users.map(async (user) => {
        const [flashcardSessions, quizAttempts] = await Promise.all([
          this.prisma.flashcardStudySession.findMany({
            where: {
              userId: user.id,
              completed: true,
              createdAt: { gte: startDate },
            },
          }),
          this.prisma.quizAttempt.findMany({
            where: {
              userId: user.id,
              completed: true,
              createdAt: { gte: startDate },
            },
          }),
        ]);

        const flashcardCorrect = flashcardSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
        const flashcardTotal = flashcardSessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
        
        // Quiz stats - count from score/maxScore for now
        const quizCorrect = quizAttempts.reduce((sum, a) => sum + a.score, 0);
        const quizTotal = quizAttempts.reduce((sum, a) => sum + a.maxScore, 0);

        const totalCorrect = flashcardCorrect + quizCorrect;
        const total = flashcardTotal + quizTotal;
        const accuracy = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

        const { currentStreak } = await this.calculateStreaks(user.id);

        const kanjiMastered = await this.prisma.flashcardCard.count({
          where: {
            deck: { userId: user.id },
            interval: { gte: 180 },
          },
        });

        const xp = this.calculateXP(
          flashcardSessions.length,
          quizAttempts.length,
          kanjiMastered,
          currentStreak,
        );

        const level = this.calculateLevel(xp);

        return {
          userId: user.id,
          username: user.name || user.email.split('@')[0],
          avatar: user.profileImage || null,
          xp,
          level,
          streak: currentStreak,
          accuracy,
          cards: flashcardTotal + quizTotal,
        };
      }),
    );

    // Sort by selected type
    let sorted: typeof userStats;
    switch (type) {
      case 'streak':
        sorted = userStats.sort((a, b) => b.streak - a.streak);
        break;
      case 'accuracy':
        sorted = userStats.sort((a, b) => b.accuracy - a.accuracy);
        break;
      case 'cards':
        sorted = userStats.sort((a, b) => b.cards - a.cards);
        break;
      default: // xp
        sorted = userStats.sort((a, b) => b.xp - a.xp);
    }

    // Create leaderboard entries
    const entries: LeaderboardEntryDto[] = sorted.slice(0, limit).map((stat, index) => ({
      rank: index + 1,
      userId: stat.userId,
      username: stat.username,
      avatar: stat.avatar ||  undefined, // Convert null to undefined
      score: type === 'streak' ? stat.streak : type === 'accuracy' ? stat.accuracy : type === 'cards' ? stat.cards : stat.xp,
      xp: stat.xp,
      level: stat.level,
      streak: stat.streak,
      isCurrentUser: stat.userId === userId,
    }));

    // Find current user's rank
    const currentUserIndex = sorted.findIndex((s) => s.userId === userId);
    const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : sorted.length + 1;
    const currentUserStat = sorted[currentUserIndex];

    const currentUser: LeaderboardEntryDto | null = currentUserStat
      ? {
          rank: currentUserRank,
          userId: currentUserStat.userId,
          username: currentUserStat.username,
          avatar: currentUserStat.avatar || undefined,
          score: type === 'streak' ? currentUserStat.streak : type === 'accuracy' ? currentUserStat.accuracy : type === 'cards' ? currentUserStat.cards : currentUserStat.xp,
          xp: currentUserStat.xp,
          level: currentUserStat.level,
          streak: currentUserStat.streak,
          isCurrentUser: true,
        }
      : null;

    return {
      type,
      period,
      entries,
      currentUserRank,
      currentUser,
      totalUsers: sorted.length,
    };
  }

  /**
   * Get achievements
   */
  async getAchievements(userId: number): Promise<AchievementsDto> {
    // Define achievement system
    const achievementDefinitions = this.getAchievementDefinitions();

    // Get user stats
    const overview = await this.getProgressOverview(userId);

    // Calculate progress for each achievement
    const achievements: AchievementDto[] = achievementDefinitions.map((def) => {
      const currentValue = this.getAchievementCurrentValue(def.id, overview);
      const progress = Math.min(100, Math.round((currentValue / def.targetValue) * 100));
      const unlocked = currentValue >= def.targetValue;

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        unlocked,
        unlockedAt: unlocked ? new Date() : undefined, // In real app, store unlock date
        progress,
        currentValue,
        targetValue: def.targetValue,
        xpReward: def.xpReward,
      };
    });

    const totalUnlocked = achievements.filter((a) => a.unlocked).length;
    const totalAvailable = achievements.length;
    const completionPercentage = Math.round((totalUnlocked / totalAvailable) * 100);

    const recentlyUnlocked = achievements
      .filter((a) => a.unlocked)
      .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
      .slice(0, 5);

    return {
      achievements,
      totalUnlocked,
      totalAvailable,
      completionPercentage,
      recentlyUnlocked,
    };
  }

  /**
   * Get chart data for progress visualization
   */
  async getChartData(userId: number, query: ChartDataQueryDto): Promise<ChartDataDto> {
    const { period = ProgressPeriod.WEEK, points = 7 } = query;
    const days = Math.min(points, this.getDaysInPeriod(period));

    const labels: string[] = [];
    const studyTime: number[] = [];
    const cardsReviewed: number[] = [];
    const quizAttempts: number[] = [];
    const accuracy: number[] = [];
    const xpEarned: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const label = date.toISOString().split('T')[0];
      labels.push(label);

      // Get flashcard sessions for this day
      const flashcardSessions = await this.prisma.flashcardStudySession.findMany({
        where: {
          userId,
          completed: true,
          createdAt: { gte: date, lt: nextDate },
        },
      });

      // Get quiz attempts for this day
      const quizAttemptsDay = await this.prisma.quizAttempt.findMany({
        where: {
          userId,
          completed: true,
          createdAt: { gte: date, lt: nextDate },
        },
      });

      const flashcardTime = flashcardSessions.reduce((sum, s) => sum + s.totalTimeSpent, 0);
      const quizTime = quizAttemptsDay.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      const totalTime = flashcardTime + quizTime;

      const flashcardCards = flashcardSessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
      const flashcardCorrect = flashcardSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
      const quizCorrect = quizAttemptsDay.reduce((sum, a) => sum + a.correctAnswers, 0);
      const quizTotal = quizAttemptsDay.reduce((sum, a) => sum + a.totalQuestions, 0);

      const totalCorrect = flashcardCorrect + quizCorrect;
      const total = flashcardCards + quizTotal;
      const dayAccuracy = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

      const dayXP = this.calculateXP(flashcardSessions.length, quizAttemptsDay.length, 0, 0);

      studyTime.push(totalTime);
      cardsReviewed.push(flashcardCards);
      quizAttempts.push(quizAttemptsDay.length);
      accuracy.push(dayAccuracy);
      xpEarned.push(dayXP);
    }

    return {
      labels,
      studyTime,
      cardsReviewed,
      quizAttempts,
      accuracy,
      xpEarned,
    };
  }

  /**
   * Get study time tracking
   */
  async getStudyTime(userId: number, query: StudyTimeQueryDto): Promise<StudyTimeDto> {
    const { period = ProgressPeriod.WEEK } = query;
    const startDate = this.getStartDate(period);

    const [flashcardSessions, quizAttempts] = await Promise.all([
      this.prisma.flashcardStudySession.findMany({
        where: {
          userId,
          completed: true,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.quizAttempt.findMany({
        where: {
          userId,
          completed: true,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const flashcardTime = flashcardSessions.reduce((sum, s) => sum + s.totalTimeSpent, 0);
    const quizTime = quizAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const totalTime = flashcardTime + quizTime;

    const totalSessions = flashcardSessions.length + quizAttempts.length;
    const avgSessionTime = totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;

    const daysInPeriod = this.getDaysInPeriod(period);
    const avgDailyTime = daysInPeriod > 0 ? Math.round(totalTime / daysInPeriod) : 0;

    // Analyze by day of week
    const dayMap = new Map<number, number>();
    flashcardSessions.forEach((session) => {
      const day = session.createdAt.getDay();
      const time = session.totalTimeSpent;
      dayMap.set(day, (dayMap.get(day) || 0) + time);
    });
    quizAttempts.forEach((attempt) => {
      const day = attempt.createdAt.getDay();
      const time = attempt.timeSpent || 0;
      dayMap.set(day, (dayMap.get(day) || 0) + time);
    });

    const mostProductiveDayNum = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostProductiveDay = dayNames[mostProductiveDayNum];

    // Analyze by hour
    const hourMap = new Map<number, number>();
    flashcardSessions.forEach((session) => {
      const hour = session.createdAt.getHours();
      const time = session.totalTimeSpent;
      hourMap.set(hour, (hourMap.get(hour) || 0) + time);
    });
    quizAttempts.forEach((attempt) => {
      const hour = attempt.createdAt.getHours();
      const time = attempt.timeSpent || 0;
      hourMap.set(hour, (hourMap.get(hour) || 0) + time);
    });

    const mostProductiveHour = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Daily breakdown
    const dailyBreakdown = await this.generateDailyStudyTimeBreakdown(
      userId,
      startDate,
      daysInPeriod,
    );

    return {
      totalTime,
      flashcardTime,
      quizTime,
      avgDailyTime,
      totalSessions,
      avgSessionTime,
      mostProductiveDay,
      mostProductiveHour,
      dailyBreakdown,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate study streaks
   */
  private async calculateStreaks(userId: number): Promise<{ currentStreak: number; longestStreak: number }> {
    const [flashcardSessions, quizAttempts] = await Promise.all([
      this.prisma.flashcardStudySession.findMany({
        where: { userId, completed: true },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId, completed: true },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const allDates = [...flashcardSessions, ...quizAttempts].map((s) => s.createdAt);

    if (allDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Extract unique dates
    const uniqueDates = Array.from(
      new Set(
        allDates.map((d) => {
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        }),
      ),
    )
      .sort((a, b) => b - a)
      .map((t) => new Date(t));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastStudyDate = uniqueDates[0];
    const isStreakActive =
      lastStudyDate.getTime() === today.getTime() || lastStudyDate.getTime() === yesterday.getTime();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

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
   * Calculate streaks with detailed info
   */
  private async calculateStreaksDetailed(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakDates: Date[];
    isActive: boolean;
    lastStudyDate: Date;
  }> {
    const [flashcardSessions, quizAttempts] = await Promise.all([
      this.prisma.flashcardStudySession.findMany({
        where: { userId, completed: true },
        select: { createdAt: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId, completed: true },
        select: { createdAt: true },
      }),
    ]);

    const allDates = [...flashcardSessions, ...quizAttempts].map((s) => s.createdAt);

    if (allDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakDates: [],
        isActive: false,
        lastStudyDate: new Date(),
      };
    }

    const uniqueDates = Array.from(
      new Set(
        allDates.map((d) => {
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        }),
      ),
    )
      .sort((a, b) => b - a)
      .map((t) => new Date(t));

    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastStudyDate = uniqueDates[0];
    const isActive =
      lastStudyDate.getTime() === today.getTime() || lastStudyDate.getTime() === yesterday.getTime();

    return {
      currentStreak,
      longestStreak,
      streakDates: uniqueDates,
      isActive,
      lastStudyDate,
    };
  }

  /**
   * Calculate XP based on activities
   */
  private calculateXP(
    flashcardSessions: number,
    quizAttempts: number,
    kanjiMastered: number,
    streak: number,
  ): number {
    const sessionXP = flashcardSessions * 50;
    const quizXP = quizAttempts * 100;
    const masteryXP = kanjiMastered * 200;
    const streakXP = streak * 25;

    return sessionXP + quizXP + masteryXP + streakXP;
  }

  /**
   * Calculate level from XP
   */
  private calculateLevel(xp: number): number {
    // Level formula: level = floor(sqrt(xp / 100))
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  /**
   * Get start date for period
   */
  private getStartDate(period: ProgressPeriod): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case ProgressPeriod.DAY:
        startDate.setHours(0, 0, 0, 0);
        break;
      case ProgressPeriod.WEEK:
        startDate.setDate(now.getDate() - 7);
        break;
      case ProgressPeriod.MONTH:
        startDate.setDate(now.getDate() - 30);
        break;
      case ProgressPeriod.YEAR:
        startDate.setDate(now.getDate() - 365);
        break;
      case ProgressPeriod.ALL:
        startDate.setFullYear(2000, 0, 1);
        break;
    }

    return startDate;
  }

  /**
   * Get number of days in period
   */
  private getDaysInPeriod(period: ProgressPeriod): number {
    switch (period) {
      case ProgressPeriod.DAY:
        return 1;
      case ProgressPeriod.WEEK:
        return 7;
      case ProgressPeriod.MONTH:
        return 30;
      case ProgressPeriod.YEAR:
        return 365;
      case ProgressPeriod.ALL:
        return 3650; // 10 years
    }
  }

  /**
   * Generate daily study time breakdown
   */
  private async generateDailyStudyTimeBreakdown(
    userId: number,
    startDate: Date,
    days: number,
  ): Promise<
    Array<{
      date: string;
      totalTime: number;
      flashcardTime: number;
      quizTime: number;
      sessions: number;
    }>
  > {
    const breakdown: Array<{
      date: string;
      totalTime: number;
      flashcardTime: number;
      quizTime: number;
      sessions: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [flashcardSessions, quizAttempts] = await Promise.all([
        this.prisma.flashcardStudySession.findMany({
          where: {
            userId,
            completed: true,
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        this.prisma.quizAttempt.findMany({
          where: {
            userId,
            completed: true,
            createdAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      const flashcardTime = flashcardSessions.reduce((sum, s) => sum + s.totalTimeSpent, 0);
      const quizTime = quizAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

      breakdown.push({
        date: date.toISOString().split('T')[0],
        totalTime: flashcardTime + quizTime,
        flashcardTime,
        quizTime,
        sessions: flashcardSessions.length + quizAttempts.length,
      });
    }

    return breakdown;
  }

  /**
   * Get achievement definitions
   */
  private getAchievementDefinitions(): Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    targetValue: number;
    xpReward: number;
  }> {
    return [
      // Flashcard achievements
      { id: 'flashcard_10', name: 'First Steps', description: 'Complete 10 flashcard sessions', icon: '🎴', category: 'flashcard', targetValue: 10, xpReward: 100 },
      { id: 'flashcard_50', name: 'Dedicated Learner', description: 'Complete 50 flashcard sessions', icon: '📚', category: 'flashcard', targetValue: 50, xpReward: 500 },
      { id: 'flashcard_100', name: 'Flashcard Master', description: 'Complete 100 flashcard sessions', icon: '🏆', category: 'flashcard', targetValue: 100, xpReward: 1000 },
      
      // Quiz achievements
      { id: 'quiz_10', name: 'Quiz Starter', description: 'Complete 10 quizzes', icon: '📝', category: 'quiz', targetValue: 10, xpReward: 100 },
      { id: 'quiz_50', name: 'Quiz Expert', description: 'Complete 50 quizzes', icon: '🎯', category: 'quiz', targetValue: 50, xpReward: 500 },
      { id: 'quiz_100', name: 'Quiz Legend', description: 'Complete 100 quizzes', icon: '👑', category: 'quiz', targetValue: 100, xpReward: 1000 },
      
      // Mastery achievements
      { id: 'kanji_10', name: 'Kanji Beginner', description: 'Master 10 kanji', icon: '㊗️', category: 'mastery', targetValue: 10, xpReward: 200 },
      { id: 'kanji_50', name: 'Kanji Scholar', description: 'Master 50 kanji', icon: '🈴', category: 'mastery', targetValue: 50, xpReward: 1000 },
      { id: 'kanji_100', name: 'Kanji Sage', description: 'Master 100 kanji', icon: '🈵', category: 'mastery', targetValue: 100, xpReward: 2000 },
      
      // Streak achievements
      { id: 'streak_3', name: 'Getting Started', description: 'Study for 3 days in a row', icon: '🔥', category: 'streak', targetValue: 3, xpReward: 50 },
      { id: 'streak_7', name: 'Week Warrior', description: 'Study for 7 days in a row', icon: '💪', category: 'streak', targetValue: 7, xpReward: 150 },
      { id: 'streak_30', name: 'Consistency King', description: 'Study for 30 days in a row', icon: '👑', category: 'streak', targetValue: 30, xpReward: 500 },
      { id: 'streak_100', name: 'Unstoppable', description: 'Study for 100 days in a row', icon: '⚡', category: 'streak', targetValue: 100, xpReward: 2000 },
    ];
  }

  /**
   * Get current value for achievement
   */
  private getAchievementCurrentValue(achievementId: string, overview: ProgressOverviewDto): number {
    if (achievementId.startsWith('flashcard_')) {
      return overview.totalFlashcardSessions;
    } else if (achievementId.startsWith('quiz_')) {
      return overview.totalQuizAttempts;
    } else if (achievementId.startsWith('kanji_')) {
      return overview.kanjiMastered;
    } else if (achievementId.startsWith('streak_')) {
      return overview.longestStreak;
    }
    return 0;
  }
}
