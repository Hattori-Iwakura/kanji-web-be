import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

type KanjiId = number;

export class BulkAddCardsDto {
  @ApiProperty({
    type: [Number],
    description: 'List of kanji IDs to add to the deck',
    example: [101, 205, 330],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  kanjiIds!: KanjiId[];
}
