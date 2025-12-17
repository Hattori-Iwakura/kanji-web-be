import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordStudySessionDto {
  @ApiProperty({
    description: 'Deck ID being studied',
    example: 1,
  })
  @IsInt()
  @Min(1)
  deck_id: number;

  @ApiProperty({
    description: 'Number of cards studied in this session',
    example: 10,
  })
  @IsInt()
  @Min(1)
  cards_studied: number;
}
