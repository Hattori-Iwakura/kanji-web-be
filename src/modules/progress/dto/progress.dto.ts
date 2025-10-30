import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max, IsEnum } from 'class-validator';

// Period enum for filtering
export enum ProgressPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all',
}

// ==================== PROGRESS OVERVIEW ====================

export class ProgressOverviewDto {
  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Current study streak (days)' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest study streak (days)' })
  longestStreak: number;

  @ApiProperty({ description: 'Total study time (seconds)' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Total flashcard sessions completed' })
  totalFlashcardSessions: number;

  @ApiProperty({ description: 'Total quiz attempts' })
  totalQuizAttempts: number;

  @ApiProperty({ description: 'Flashcard accuracy percentage' })
  flashcardAccuracy: number;

  @ApiProperty({ description: 'Quiz accuracy percentage' })
  quizAccuracy: number;

  @ApiProperty({ description: 'Total kanji mastered' })
  kanjiMastered: number;

  @ApiProperty({ description: 'Total achievements unlocked' })
  achievements: number;

  @ApiProperty({ description: 'User level/rank' })
  level: number;

  @ApiProperty({ description: 'XP points earned' })
  xp: number;

  @ApiProperty({ description: 'Last active date' })
  lastActive: Date;
}

// ==================== FLASHCARD STATISTICS ====================

export class FlashcardProgressQueryDto {
  @ApiPropertyOptional({
    description: 'Time period',
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;

  @ApiPropertyOptional({
    description: 'Deck ID filter',
  })
  @IsOptional()
  @IsInt()
  deckId?: number;
}

export class FlashcardProgressDto {
  @ApiProperty({ description: 'Total cards studied' })
  totalCardsStudied: number;

  @ApiProperty({ description: 'Cards mastered (interval >= 180 days)' })
  cardsMastered: number;

  @ApiProperty({ description: 'Cards in review (21-180 days)' })
  cardsInReview: number;

  @ApiProperty({ description: 'Cards being learned (< 21 days)' })
  cardsLearning: number;

  @ApiProperty({ description: 'New cards not yet studied' })
  newCards: number;

  @ApiProperty({ description: 'Total study sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Total correct reviews' })
  correctReviews: number;

  @ApiProperty({ description: 'Total incorrect reviews' })
  incorrectReviews: number;

  @ApiProperty({ description: 'Overall accuracy percentage' })
  accuracy: number;

  @ApiProperty({ description: 'Average easiness factor' })
  avgEasinessFactor: number;

  @ApiProperty({ description: 'Total study time (seconds)' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Average session time (seconds)' })
  avgSessionTime: number;

  @ApiProperty({ description: 'Reviews per day (average)' })
  reviewsPerDay: number;
}

// ==================== QUIZ STATISTICS ====================

export class QuizProgressQueryDto {
  @ApiPropertyOptional({
    description: 'Time period',
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;

  @ApiPropertyOptional({
    description: 'Quiz ID filter',
  })
  @IsOptional()
  @IsInt()
  quizId?: number;
}

export class QuizProgressDto {
  @ApiProperty({ description: 'Total quiz attempts' })
  totalAttempts: number;

  @ApiProperty({ description: 'Quizzes completed' })
  quizzesCompleted: number;

  @ApiProperty({ description: 'Total questions answered' })
  totalQuestions: number;

  @ApiProperty({ description: 'Correct answers' })
  correctAnswers: number;

  @ApiProperty({ description: 'Incorrect answers' })
  incorrectAnswers: number;

  @ApiProperty({ description: 'Overall accuracy percentage' })
  accuracy: number;

  @ApiProperty({ description: 'Average score percentage' })
  avgScore: number;

  @ApiProperty({ description: 'Best score percentage' })
  bestScore: number;

  @ApiProperty({ description: 'Total time spent on quizzes (seconds)' })
  totalTime: number;

  @ApiProperty({ description: 'Average time per quiz (seconds)' })
  avgTimePerQuiz: number;

  @ApiProperty({ description: 'By difficulty breakdown' })
  byDifficulty: Array<{
    difficulty: string;
    attempts: number;
    accuracy: number;
  }>;
}

// ==================== STREAK TRACKING ====================

export class StreakDto {
  @ApiProperty({ description: 'Current active streak (days)' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest streak ever (days)' })
  longestStreak: number;

  @ApiProperty({ description: 'Streak is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Last study date' })
  lastStudyDate: Date;

  @ApiProperty({ description: 'Study dates in current streak' })
  streakDates: Date[];

  @ApiProperty({ description: 'Total study days (all time)' })
  totalStudyDays: number;

  @ApiProperty({ description: 'Days studied this week' })
  daysThisWeek: number;

  @ApiProperty({ description: 'Days studied this month' })
  daysThisMonth: number;
}

// ==================== LEADERBOARD ====================

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for leaderboard',
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;

  @ApiPropertyOptional({
    description: 'Limit number of results',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Leaderboard type: xp, streak, accuracy, cards',
    default: 'xp',
  })
  @IsOptional()
  type?: 'xp' | 'streak' | 'accuracy' | 'cards';
}

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'Rank position' })
  rank: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'Score/metric value' })
  score: number;

  @ApiProperty({ description: 'XP points' })
  xp: number;

  @ApiProperty({ description: 'User level' })
  level: number;

  @ApiProperty({ description: 'Current streak' })
  streak: number;

  @ApiProperty({ description: 'Is current user' })
  isCurrentUser: boolean;
}

export class LeaderboardDto {
  @ApiProperty({ description: 'Leaderboard type' })
  type: string;

  @ApiProperty({ description: 'Time period' })
  period: string;

  @ApiProperty({ description: 'Top users', type: [LeaderboardEntryDto] })
  entries: LeaderboardEntryDto[];

  @ApiProperty({ description: 'Current user rank' })
  currentUserRank: number;

  @ApiPropertyOptional({ description: 'Current user entry' })
  currentUser: LeaderboardEntryDto | null;

  @ApiProperty({ description: 'Total users in leaderboard' })
  totalUsers: number;
}

// ==================== ACHIEVEMENTS ====================

export class AchievementDto {
  @ApiProperty({ description: 'Achievement ID' })
  id: string;

  @ApiProperty({ description: 'Achievement name' })
  name: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Icon/badge' })
  icon: string;

  @ApiProperty({ description: 'Achievement category' })
  category: string;

  @ApiProperty({ description: 'Is unlocked' })
  unlocked: boolean;

  @ApiProperty({ description: 'Unlock date' })
  unlockedAt?: Date;

  @ApiProperty({ description: 'Progress toward achievement (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Target value to unlock' })
  targetValue: number;

  @ApiProperty({ description: 'XP reward' })
  xpReward: number;
}

export class AchievementsDto {
  @ApiProperty({ description: 'All achievements', type: [AchievementDto] })
  achievements: AchievementDto[];

  @ApiProperty({ description: 'Total unlocked' })
  totalUnlocked: number;

  @ApiProperty({ description: 'Total available' })
  totalAvailable: number;

  @ApiProperty({ description: 'Completion percentage' })
  completionPercentage: number;

  @ApiProperty({ description: 'Recently unlocked', type: [AchievementDto] })
  recentlyUnlocked: AchievementDto[];
}

// ==================== CHART DATA ====================

export class ChartDataQueryDto {
  @ApiPropertyOptional({
    description: 'Chart period',
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;

  @ApiPropertyOptional({
    description: 'Number of data points',
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  points?: number;
}

export class ChartDataDto {
  @ApiProperty({ description: 'Date labels', type: [String] })
  labels: string[];

  @ApiProperty({ description: 'Study time series (seconds)' })
  studyTime: number[];

  @ApiProperty({ description: 'Cards reviewed series' })
  cardsReviewed: number[];

  @ApiProperty({ description: 'Quiz attempts series' })
  quizAttempts: number[];

  @ApiProperty({ description: 'Accuracy series (percentage)' })
  accuracy: number[];

  @ApiProperty({ description: 'XP earned series' })
  xpEarned: number[];
}

// ==================== STUDY TIME TRACKING ====================

export class StudyTimeQueryDto {
  @ApiPropertyOptional({
    description: 'Time period',
    enum: ProgressPeriod,
    default: ProgressPeriod.WEEK,
  })
  @IsOptional()
  @IsEnum(ProgressPeriod)
  period?: ProgressPeriod;
}

export class StudyTimeDto {
  @ApiProperty({ description: 'Total study time (seconds)' })
  totalTime: number;

  @ApiProperty({ description: 'Flashcard study time (seconds)' })
  flashcardTime: number;

  @ApiProperty({ description: 'Quiz study time (seconds)' })
  quizTime: number;

  @ApiProperty({ description: 'Average daily study time (seconds)' })
  avgDailyTime: number;

  @ApiProperty({ description: 'Total study sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Average session time (seconds)' })
  avgSessionTime: number;

  @ApiProperty({ description: 'Most productive day of week' })
  mostProductiveDay: string;

  @ApiProperty({ description: 'Most productive hour (0-23)' })
  mostProductiveHour: number;

  @ApiProperty({ description: 'Daily breakdown' })
  dailyBreakdown: Array<{
    date: string;
    totalTime: number;
    flashcardTime: number;
    quizTime: number;
    sessions: number;
  }>;
}
