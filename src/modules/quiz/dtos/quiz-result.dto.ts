import { IsInt, IsArray, ValidateNested, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionAnswerDto {
  @ApiProperty({ description: 'ID câu hỏi' })
  @IsInt()
  question_id: number;

  @ApiProperty({ description: 'Câu trả lời của user' })
  @IsString()
  user_answer: string;
}

export class SubmitQuizDto {
  @ApiProperty({ description: 'Danh sách câu trả lời', type: [QuestionAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionAnswerDto)
  answers: QuestionAnswerDto[];

  @ApiPropertyOptional({ description: 'Thời gian làm bài (giây)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  time_taken?: number;
}

export class QuizResultQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo quiz ID' })
  @IsOptional()
  quiz_id?: number | string;

  @ApiPropertyOptional({ description: 'Lọc theo user ID' })
  @IsOptional()
  user_id?: number | string;

  @ApiPropertyOptional({ description: 'Số lượng kết quả', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  limit?: number | string;
}
