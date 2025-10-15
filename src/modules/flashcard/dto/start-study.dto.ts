import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class StartStudyDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Maximum number of cards to study',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_cards?: number;
}
