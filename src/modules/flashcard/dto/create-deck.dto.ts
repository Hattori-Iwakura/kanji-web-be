import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsInt } from 'class-validator';

export class CreateDeckDto {
  @ApiProperty({ example: 'JLPT N5 Kanji', description: 'Deck name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Basic kanji for JLPT N5 level',
    description: 'Deck description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'custom',
    description: 'Source type: custom or kanji_list',
    enum: ['custom', 'kanji_list'],
  })
  @IsIn(['custom', 'kanji_list'])
  source_type: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'KanjiCollections ID if source_type is kanji_list',
  })
  @IsOptional()
  @IsInt()
  source_id?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether deck is public',
  })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
