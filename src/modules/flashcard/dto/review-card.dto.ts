import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class ReviewCardDto {
  @ApiProperty({
    example: 3,
    description: 'Rating: 0=again, 1=hard, 2=good, 3=easy, 4=very easy, 5=perfect',
    minimum: 0,
    maximum: 5,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 10, description: 'Time spent in seconds' })
  @IsInt()
  @Min(0)
  time_spent: number;
}
