import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFlashcardDeckDto {
  @ApiProperty({ example: 'JLPT N5 Kanji', description: 'Tên deck' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bộ flashcard cho JLPT N5', description: 'Mô tả deck' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Deck công khai hay không' })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}

export class UpdateFlashcardDeckDto {
  @ApiPropertyOptional({ example: 'JLPT N5 Kanji - Updated', description: 'Tên deck' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Mô tả mới', description: 'Mô tả deck' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Deck công khai hay không' })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;
}

export class FlashcardDeckQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Lọc theo user_id' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  user_id?: number;

  @ApiPropertyOptional({ example: true, description: 'Lọc deck công khai' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_public?: boolean;

  @ApiPropertyOptional({ example: 'JLPT', description: 'Tìm kiếm theo tên' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Số trang' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Số lượng mỗi trang' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
