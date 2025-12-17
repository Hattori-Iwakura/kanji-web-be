import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum } from "class-validator";
import { Transform } from "class-transformer";
import { Expose, Type } from "class-transformer";

export enum CollectionType {
  CUSTOM = 'custom',
  JLPT = 'jlpt',
  GRADE = 'grade',
  FREQUENCY = 'frequency'
}

export class CreateKanjiListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ enum: CollectionType, default: CollectionType.CUSTOM })
  @IsOptional()
  @IsEnum(CollectionType)
  collection_type?: CollectionType;

  @ApiPropertyOptional({ description: 'Additional metadata for auto-generated collections' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'User ID (admin only)' })
  @IsOptional()
  @IsNumber()
  user_id?: number;
}

export class UpdateKanjiListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}

export class AddKanjiToListDto {
  @ApiProperty({ description: 'Kanji IDs to add', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  kanji_ids: number[];

  @ApiPropertyOptional({ description: 'Custom ordering for kanji' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  order_indices?: number[];
}

export class KanjiListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by collection type' })
  @IsOptional()
  @IsEnum(CollectionType)
  collection_type?: CollectionType;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: 'Include public collections', default: true })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? true : value === 'true')
  @IsBoolean()
  include_public?: boolean;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : 1)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : 20)
  @IsNumber()
  limit?: number;
}


export class GenerateJLPTListDto {
  @ApiProperty({ description: 'JLPT Level (1-5)' })
  @IsNumber()
  jlpt_level: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}

export class GenerateGradeListDto {
  @ApiProperty({ description: 'Grade Level (1-6)' })
  @IsNumber()
  grade_level: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}

export class GenerateFrequencyListDto {
  @ApiProperty({ description: 'Top N most frequent kanji' })
  @IsNumber()
  top_count: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}

export class BulkAddKanjiDto {
  @ApiProperty({ description: 'Filter to add kanji by JLPT level' })
  @IsOptional()
  @IsNumber()
  jlpt?: number;

  @ApiProperty({ description: 'Filter to add kanji by grade' })
  @IsOptional()
  @IsNumber()
  grade?: number;

  @ApiProperty({ description: 'Add top N most frequent kanji' })
  @IsOptional()
  @IsNumber()
  top_frequency?: number;

  @ApiProperty({ description: 'Search term to filter kanji' })
  @IsOptional()
  @IsString()
  search?: string;
}