import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCardDto {
  @ApiPropertyOptional({
    example: '日',
    description: 'Front content of the card',
  })
  @IsOptional()
  @IsString()
  front_content?: string;

  @ApiPropertyOptional({
    example: '{"meanings": ["sun", "day"], "onyomi": ["にち"], "kunyomi": ["ひ"]}',
    description: 'Back content of the card (JSON string)',
  })
  @IsOptional()
  @IsString()
  back_content?: string;
}
