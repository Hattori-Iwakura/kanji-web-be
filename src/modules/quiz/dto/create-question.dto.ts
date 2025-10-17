import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizQuestionType } from 'generated/prisma';

export class CreateQuestionDto {
  @ApiProperty({ 
    description: 'Question type',
    enum: QuizQuestionType,
    example: QuizQuestionType.MULTIPLE_CHOICE 
  })
  @IsEnum(QuizQuestionType)
  @IsNotEmpty()
  type: QuizQuestionType;

  @ApiProperty({ 
    description: 'Question text', 
    example: 'What is the meaning of 日?' 
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ 
    description: 'Correct answer (option key for multiple choice, text for fill-in-blank, kanji for drawing)',
    example: 'A'
  })
  @IsString()
  @IsNotEmpty()
  correct_answer: string;

  @ApiPropertyOptional({ 
    description: 'Answer options for multiple choice',
    example: { A: 'Sun/Day', B: 'Moon', C: 'Star', D: 'Earth' }
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, string>;

  @ApiPropertyOptional({ 
    description: 'Additional metadata (hints, stroke count, etc.)',
    example: { hint: 'Common kanji for time', strokeCount: 4 }
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Question order', example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order_index?: number;

  @ApiPropertyOptional({ description: 'Points awarded for correct answer', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ description: 'Time limit in seconds', example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  time_limit?: number;

  @ApiPropertyOptional({ 
    description: 'Explanation shown after answering',
    example: '日 means sun or day and is one of the most common kanji'
  })
  @IsString()
  @IsOptional()
  explanation?: string;
}
