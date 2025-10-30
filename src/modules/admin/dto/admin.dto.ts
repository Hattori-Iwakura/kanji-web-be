import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PeriodEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum PublishRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PublishRequestType {
  QUIZ = 'quiz',
  LIST = 'list',
  DECK = 'deck',
}

// Dashboard Query DTOs
export class PeriodQueryDto {
  @ApiPropertyOptional({ enum: PeriodEnum, default: PeriodEnum.WEEK })
  @IsOptional()
  @IsEnum(PeriodEnum)
  period?: PeriodEnum = PeriodEnum.WEEK;
}

export class ChartQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d', '1y'], default: '30d' })
  @IsOptional()
  @IsString()
  period?: string = '30d';
}

export class ActivityQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

// Publish Request DTOs
export class PublishRequestQueryDto {
  @ApiPropertyOptional({ enum: PublishRequestStatus })
  @IsOptional()
  @IsEnum(PublishRequestStatus)
  status?: PublishRequestStatus;

  @ApiPropertyOptional({ enum: PublishRequestType })
  @IsOptional()
  @IsEnum(PublishRequestType)
  type?: PublishRequestType;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class ReviewPublishRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewMessage?: string;
}

// Activity DTOs
export class ActivityLogsQueryDto {
  @ApiPropertyOptional({ example: '2025-10-24' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 100;
}

export class SystemMetricsQueryDto {
  @ApiPropertyOptional({ enum: ['1h', '24h', '7d'], default: '24h' })
  @IsOptional()
  @IsString()
  period?: string = '24h';
}
