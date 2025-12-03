import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizType, DifficultyLevel, QuestionType } from 'generated/prisma';

export class CreateQuizDto {
  @ApiProperty({ description: 'Tên quiz' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả quiz' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Quiz công khai hay riêng tư', default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: 'Loại quiz', enum: QuizType, default: QuizType.MULTIPLE_CHOICE })
  @IsOptional()
  @IsEnum(QuizType)
  quiz_type?: QuizType;

  @ApiPropertyOptional({ description: 'Độ khó', enum: DifficultyLevel, default: DifficultyLevel.MEDIUM })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Thời gian giới hạn (giây)', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  time_limit?: number;

  @ApiPropertyOptional({ description: 'Điểm tối thiểu để đạt (%)', minimum: 0, maximum: 100, default: 70 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passing_score?: number;
}

export class UpdateQuizDto {
  @ApiPropertyOptional({ description: 'Tên quiz' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả quiz' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Quiz công khai hay riêng tư' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: 'Loại quiz', enum: QuizType })
  @IsOptional()
  @IsEnum(QuizType)
  quiz_type?: QuizType;

  @ApiPropertyOptional({ description: 'Độ khó', enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Thời gian giới hạn (giây)', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  time_limit?: number;

  @ApiPropertyOptional({ description: 'Điểm tối thiểu để đạt (%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passing_score?: number;
}

export class CreateQuestionDto {
  @ApiPropertyOptional({ description: 'ID của kanji' })
  @IsOptional()
  @IsInt()
  kanji_id?: number;

  @ApiProperty({ description: 'Loại câu hỏi', enum: QuestionType })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({ description: 'Nội dung câu hỏi' })
  @IsString()
  question_text: string;

  @ApiProperty({ description: 'Đáp án đúng' })
  @IsString()
  correct_answer: string;

  @ApiPropertyOptional({ description: 'Các lựa chọn (cho multiple choice)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Giải thích đáp án' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Điểm số', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ description: 'Thứ tự câu hỏi' })
  @IsOptional()
  @IsInt()
  order_index?: number;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'ID của kanji' })
  @IsOptional()
  @IsInt()
  kanji_id?: number;

  @ApiPropertyOptional({ description: 'Loại câu hỏi', enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  question_type?: QuestionType;

  @ApiPropertyOptional({ description: 'Nội dung câu hỏi' })
  @IsOptional()
  @IsString()
  question_text?: string;

  @ApiPropertyOptional({ description: 'Đáp án đúng' })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiPropertyOptional({ description: 'Các lựa chọn (cho multiple choice)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Giải thích đáp án' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Điểm số', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ description: 'Thứ tự câu hỏi' })
  @IsOptional()
  @IsInt()
  order_index?: number;
}

export class BulkCreateQuestionsDto {
  @ApiProperty({ description: 'Danh sách câu hỏi', type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class QuizQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo độ khó', enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Lọc theo loại quiz', enum: QuizType })
  @IsOptional()
  @IsEnum(QuizType)
  quiz_type?: QuizType;

  @ApiPropertyOptional({ description: 'Chỉ lấy quiz công khai' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: 'ID người tạo' })
  @IsOptional()
  @IsInt()
  user_id?: number;
}
