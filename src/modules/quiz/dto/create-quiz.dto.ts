import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulty } from 'generated/prisma';

export class CreateQuizDto {
  @ApiProperty({ description: 'Quiz title', example: 'JLPT N5 Kanji Quiz' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Quiz description', example: 'Test your knowledge of basic kanji' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Quiz difficulty level',
    enum: QuizDifficulty,
    example: QuizDifficulty.BEGINNER 
  })
  @IsEnum(QuizDifficulty)
  @IsOptional()
  difficulty?: QuizDifficulty;

  @ApiPropertyOptional({ description: 'Quiz category', example: 'JLPT N5' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ 
    description: 'Quiz tags', 
    type: [String],
    example: ['kanji', 'beginner', 'jlpt'] 
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make quiz public', example: false })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}
