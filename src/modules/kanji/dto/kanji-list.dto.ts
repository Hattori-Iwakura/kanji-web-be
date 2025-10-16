import { IsString, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKanjiListDto {
  @ApiProperty({ description: 'List name' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'List description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Make list public', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddToListDto {
  @ApiProperty({ description: 'List ID' })
  @IsInt()
  listId: number;

  @ApiProperty({ description: 'Kanji characters to add', type: [String] })
  @IsArray()
  @IsString({ each: true })
  kanjiCharacters: string[];

  @ApiProperty({ required: false, description: 'Optional notes for kanji' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateListItemDto {
  @ApiProperty({ required: false, description: 'Notes for this kanji' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Order index' })
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

export class ReorderListDto {
  @ApiProperty({ description: 'Array of kanji IDs in new order', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  kanjiIds: number[];
}
