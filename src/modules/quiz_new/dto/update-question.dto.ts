import { IsString, IsEnum, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { $Enums } from 'generated/prisma';

export class UpdateQuestionDto {
  @IsOptional()
  @IsEnum($Enums.QuizQuestionType)
  type?: $Enums.QuizQuestionType;

  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

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
  meanings?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
