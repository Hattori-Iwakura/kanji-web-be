import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AddCardDto {
  @ApiProperty({ example: 1, description: 'Kanji ID to add to deck' })
  @IsInt()
  kanji_id: number;
}
