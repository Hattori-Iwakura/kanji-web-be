import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// ===== INPUT DTOs =====
export class RecognizeKanjiDto {
  @ApiProperty({
    description: 'Base64 encoded image from canvas drawing',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsString()
  @IsNotEmpty()
  image: string;
}

// ===== OUTPUT DTOs =====
export class Top5PredictionDto {
  @ApiProperty({ description: 'Predicted kanji character' })
  character: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;
}

export class RecognitionResultDto {
  @ApiProperty({
    description: 'Top predicted kanji character',
    example: '一',
  })
  character: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.9876,
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'Top 5 predictions with confidence scores',
    type: [Top5PredictionDto],
  })
  top5?: Top5PredictionDto[];
}
