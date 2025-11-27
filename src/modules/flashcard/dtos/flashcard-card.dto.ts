import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFlashcardCardDto {
  @ApiProperty({ example: '日', description: 'Text mặt trước card' })
  @IsString()
  front_text: string;

  @ApiProperty({ example: 'Mặt trời, ngày', description: 'Text mặt sau card' })
  @IsString()
  back_text: string;

  @ApiPropertyOptional({ example: 'Âm Hán: にち, ニチ', description: 'Gợi ý' })
  @IsString()
  @IsOptional()
  hint?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID kanji liên quan' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  kanji_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự card trong deck' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order_index?: number;
}

export class UpdateFlashcardCardDto {
  @ApiPropertyOptional({ example: '日本', description: 'Text mặt trước card' })
  @IsString()
  @IsOptional()
  front_text?: string;

  @ApiPropertyOptional({ example: 'Nhật Bản', description: 'Text mặt sau card' })
  @IsString()
  @IsOptional()
  back_text?: string;

  @ApiPropertyOptional({ example: 'Âm Hán: にほん', description: 'Gợi ý' })
  @IsString()
  @IsOptional()
  hint?: string;

  @ApiPropertyOptional({ example: 2, description: 'ID kanji liên quan' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  kanji_id?: number;

  @ApiPropertyOptional({ example: 2, description: 'Thứ tự card trong deck' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  order_index?: number;
}

export class BulkCreateFlashcardCardDto {
  @ApiProperty({ 
    type: [CreateFlashcardCardDto],
    description: 'Danh sách cards cần tạo'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlashcardCardDto)
  cards: CreateFlashcardCardDto[];
}
