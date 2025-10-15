import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';

export class PredictKanjiDto {
  @ApiProperty({
    description: 'Base64 encoded image of kanji character',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  image: string;
}

export class Top5Prediction {
  @ApiProperty({ description: 'Predicted character' })
  character: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;
}

export class PredictResultDto {
  @ApiProperty({
    description: 'Predicted kanji character',
    example: '一',
  })
  character: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.9876,
  })
  @IsNumber()
  confidence: number;

  @ApiPropertyOptional({
    description: 'Top 5 predictions with confidence scores',
    type: [Top5Prediction],
  })
  @IsArray()
  top5?: Top5Prediction[];
}

export class AiHealthDto {
  @ApiProperty({ example: 'healthy' })
  status: string;

  @ApiProperty({ example: 'AI server is running' })
  message: string;
}