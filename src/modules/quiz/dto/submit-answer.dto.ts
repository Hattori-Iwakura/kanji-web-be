import { IsInt, IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  @IsNotEmpty()
  attempt_id: number;

  @IsInt()
  @IsNotEmpty()
  question_id: number;

  @IsString()
  @IsNotEmpty()
  user_answer: string;

  @IsInt()
  @IsOptional()
  time_spent?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>; // For drawing: {confidence, predictions, etc.}
}
