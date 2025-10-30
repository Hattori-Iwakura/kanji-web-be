import { IsInt, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsInt()
  questionId: number;

  @ApiProperty({ description: 'User answer' })
  @IsString()
  answer: string;
}

export class SubmitQuizDto {
  @ApiProperty({ description: 'Array of answers', type: [AnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @ApiPropertyOptional({ description: 'Time spent on quiz in seconds' })
  @IsOptional()
  @IsInt()
  timeSpent?: number;
}
