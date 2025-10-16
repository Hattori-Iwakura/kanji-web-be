import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

type CardId = number;

type IntegerArray = CardId[];

export class ReorderCardsDto {
  @ApiProperty({
    type: [Number],
    description: 'Ordered list of card IDs for the deck',
    example: [12, 5, 7, 3],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  cardIds!: IntegerArray;
}
