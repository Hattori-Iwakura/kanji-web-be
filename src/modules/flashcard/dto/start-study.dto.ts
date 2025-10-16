import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export enum StudySessionMode {
  MIXED = 'mixed',
  NEW = 'new',
  DUE = 'due',
  HARD = 'hard',
  CUSTOM = 'custom',
}

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

  @ApiPropertyOptional({
    enum: StudySessionMode,
    description: 'Study mode determines which cards will be selected',
    default: StudySessionMode.MIXED,
  })
  @IsOptional()
  @IsEnum(StudySessionMode)
  mode?: StudySessionMode;

  @ApiPropertyOptional({
    description: 'Randomize the order of cards selected for the session',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  randomize?: boolean;

  @ApiPropertyOptional({
    description: 'Include new cards when using custom mode',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  include_new?: boolean;

  @ApiPropertyOptional({
    description: 'Include due cards when using custom mode',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  include_due?: boolean;

  @ApiPropertyOptional({
    description: 'Include hard cards (high difficulty) when using custom mode',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  include_hard?: boolean;

  @ApiPropertyOptional({
    description: 'Difficulty threshold used to determine hard cards',
    default: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  difficulty_threshold?: number;

  @ApiPropertyOptional({
    description: 'Attempt to resume an existing active session if available',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  resume_existing?: boolean;
}
