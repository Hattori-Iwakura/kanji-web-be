import { IsString, IsEnum, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { $Enums } from 'generated/prisma';

export class CreateQuestionDto {
  @IsEnum($Enums.QuizQuestionType)
  type: $Enums.QuizQuestionType;

  @IsString()
  questionText: string;

  @IsString()
  correctAnswer: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]; // For multiple choice questions

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meanings?: string[]; // For DRAWING type - kanji meanings

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
