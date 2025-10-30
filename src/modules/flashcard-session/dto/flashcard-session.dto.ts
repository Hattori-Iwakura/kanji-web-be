import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsEnum, IsOptional, Min, Max, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// SM-2 Algorithm Quality Rating (0-5)
export enum CardQuality {
  COMPLETE_BLACKOUT = 0,      // Complete blackout
  INCORRECT_EASY_RECALL = 1,   // Incorrect but easy to recall
  INCORRECT_HARD_RECALL = 2,   // Incorrect and hard to recall
  CORRECT_HARD_RECALL = 3,     // Correct but hard to recall
  CORRECT_HESITATION = 4,      // Correct with hesitation
  PERFECT = 5,                 // Perfect response
}

// Start Session DTOs
export class StartSessionDto {
  @ApiProperty({
    description: 'Flashcard deck ID to start session',
    example: 1,
  })
  @IsInt()
  deckId: number;

  @ApiPropertyOptional({
    description: 'Maximum number of new cards to include',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  maxNewCards?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of review cards to include',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxReviewCards?: number;
}

export class StartSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: number;

  @ApiProperty({ description: 'Deck ID' })
  deckId: number;

  @ApiProperty({ description: 'Deck name' })
  deckName: string;

  @ApiProperty({ description: 'Total cards in session' })
  totalCards: number;

  @ApiProperty({ description: 'Number of new cards' })
  newCards: number;

  @ApiProperty({ description: 'Number of review cards' })
  reviewCards: number;

  @ApiProperty({ description: 'Session started at' })
  startedAt: Date;
}

// Review Card DTOs
export class ReviewCardDto {
  @ApiProperty({
    description: 'Quality rating of recall (0-5)',
    enum: CardQuality,
    example: CardQuality.PERFECT,
  })
  @IsEnum(CardQuality)
  quality: CardQuality;

  @ApiPropertyOptional({
    description: 'Time taken to answer in seconds',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;
}

export class ReviewCardResponseDto {
  @ApiProperty({ description: 'Card ID' })
  cardId: number;

  @ApiProperty({ description: 'Kanji character' })
  character: string;

  @ApiProperty({ description: 'New easiness factor' })
  easinessFactor: number;

  @ApiProperty({ description: 'New repetition count' })
  repetitions: number;

  @ApiProperty({ description: 'Interval in days' })
  interval: number;

  @ApiProperty({ description: 'Next review date' })
  nextReviewAt: Date;

  @ApiProperty({ description: 'Was this card correct?' })
  isCorrect: boolean;
}

// Session Progress DTOs
export class SessionProgressDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: number;

  @ApiProperty({ description: 'Total cards in session' })
  totalCards: number;

  @ApiProperty({ description: 'Cards reviewed' })
  cardsReviewed: number;

  @ApiProperty({ description: 'Correct answers' })
  correctAnswers: number;

  @ApiProperty({ description: 'Incorrect answers' })
  incorrectAnswers: number;

  @ApiProperty({ description: 'Accuracy percentage' })
  accuracy: number;

  @ApiProperty({ description: 'Session started at' })
  startedAt: Date;

  @ApiProperty({ description: 'Time elapsed in seconds' })
  timeElapsed: number;
}

// Complete Session DTOs
export class CompleteSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: number;

  @ApiProperty({ description: 'Total cards reviewed' })
  totalCards: number;

  @ApiProperty({ description: 'Correct answers' })
  correctAnswers: number;

  @ApiProperty({ description: 'Incorrect answers' })
  incorrectAnswers: number;

  @ApiProperty({ description: 'Accuracy percentage' })
  accuracy: number;

  @ApiProperty({ description: 'Total time in seconds' })
  totalTime: number;

  @ApiProperty({ description: 'Cards mastered (moved to next level)' })
  cardsMastered: number;

  @ApiProperty({ description: 'Session completed at' })
  completedAt: Date;
}

// Get Next Card DTOs
export class NextCardDto {
  @ApiProperty({ description: 'Card ID' })
  cardId: number;

  @ApiProperty({ description: 'Kanji ID' })
  kanjiId: number;

  @ApiProperty({ description: 'Kanji character' })
  character: string;

  @ApiProperty({ description: 'Meaning (English)' })
  meaning: string;

  @ApiProperty({ description: 'Onyomi reading' })
  onyomi: string;

  @ApiProperty({ description: 'Kunyomi reading' })
  kunyomi: string;

  @ApiProperty({ description: 'Is this a new card?' })
  isNew: boolean;

  @ApiProperty({ description: 'Current card number in session' })
  currentCard: number;

  @ApiProperty({ description: 'Total cards in session' })
  totalCards: number;
}

// Due Cards Query DTOs
export class DueCardsQueryDto {
  @ApiProperty({
    description: 'Deck ID to check due cards',
    example: 1,
  })
  @IsInt()
  deckId: number;
}

export class DueCardsResponseDto {
  @ApiProperty({ description: 'Deck ID' })
  deckId: number;

  @ApiProperty({ description: 'Deck name' })
  deckName: string;

  @ApiProperty({ description: 'Total cards due for review' })
  totalDue: number;

  @ApiProperty({ description: 'New cards available' })
  newCards: number;

  @ApiProperty({ description: 'Cards due today' })
  dueToday: number;

  @ApiProperty({ description: 'Cards overdue' })
  overdue: number;

  @ApiProperty({ description: 'Next review date' })
  nextReviewAt: Date | null;
}

// Study Statistics DTOs
export class StudyStatisticsQueryDto {
  @ApiPropertyOptional({
    description: 'Deck ID (optional, if not provided returns stats for all decks)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deckId?: number;

  @ApiPropertyOptional({
    description: 'Time period in days',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

export class StudyStatisticsResponseDto {
  @ApiProperty({ description: 'Total study sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Total cards reviewed' })
  totalCardsReviewed: number;

  @ApiProperty({ description: 'Total correct answers' })
  totalCorrect: number;

  @ApiProperty({ description: 'Total incorrect answers' })
  totalIncorrect: number;

  @ApiProperty({ description: 'Overall accuracy percentage' })
  accuracy: number;

  @ApiProperty({ description: 'Total study time in seconds' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Average study time per session (seconds)' })
  avgSessionTime: number;

  @ApiProperty({ description: 'Cards mastered in period' })
  cardsMastered: number;

  @ApiProperty({ description: 'Current study streak (days)' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest study streak (days)' })
  longestStreak: number;

  @ApiProperty({ description: 'Daily breakdown', type: [Object] })
  dailyStats: Array<{
    date: string;
    sessions: number;
    cardsReviewed: number;
    accuracy: number;
    studyTime: number;
  }>;
}

// Deck Statistics DTOs
export class DeckStatisticsDto {
  @ApiProperty({ description: 'Deck ID' })
  deckId: number;

  @ApiProperty({ description: 'Deck name' })
  deckName: string;

  @ApiProperty({ description: 'Total cards in deck' })
  totalCards: number;

  @ApiProperty({ description: 'Cards not yet studied (new)' })
  newCards: number;

  @ApiProperty({ description: 'Cards being learned (interval < 21 days)' })
  learningCards: number;

  @ApiProperty({ description: 'Cards under review (interval >= 21 days)' })
  reviewCards: number;

  @ApiProperty({ description: 'Mastered cards (interval >= 180 days)' })
  masteredCards: number;

  @ApiProperty({ description: 'Cards due for review' })
  dueCards: number;

  @ApiProperty({ description: 'Average easiness factor' })
  avgEasinessFactor: number;

  @ApiProperty({ description: 'Total study time on this deck (seconds)' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Last studied at' })
  lastStudiedAt: Date | null;
}
