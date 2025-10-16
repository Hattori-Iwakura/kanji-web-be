import { IsString, IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Kanji character' })
  @IsString()
  character: string;

  @ApiProperty({ 
    enum: ['new', 'learning', 'known', 'mastered'],
    description: 'Learning status'
  })
  @IsEnum(['new', 'learning', 'known', 'mastered'])
  status: string;
}

export class RecordReviewDto {
  @ApiProperty({ description: 'Kanji character' })
  @IsString()
  character: string;

  @ApiProperty({ description: 'Was the review correct?', type: Boolean })
  @IsInt()
  correct: number; // 0 or 1
}
