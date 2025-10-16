import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchKanjiDto {
  @ApiProperty({ required: false, description: 'Search query for character, meaning, or reading' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ required: false, description: 'Filter by JLPT levels', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  jlptLevels?: number[];

  @ApiProperty({ required: false, description: 'Filter by school grades', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  grades?: number[];

  @ApiProperty({ required: false, description: 'Minimum stroke count' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minStrokes?: number;

  @ApiProperty({ required: false, description: 'Maximum stroke count' })
  @IsOptional()
  @IsInt()
  @Max(50)
  @Type(() => Number)
  maxStrokes?: number;

  @ApiProperty({ required: false, description: 'Filter by radical' })
  @IsOptional()
  @IsString()
  radical?: string;

  @ApiProperty({ required: false, description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ 
    required: false, 
    enum: ['frequency', 'strokes', 'grade', 'jlpt', 'alphabetical'],
    description: 'Sort order'
  })
  @IsOptional()
  @IsEnum(['frequency', 'strokes', 'grade', 'jlpt', 'alphabetical'])
  sortBy?: string = 'frequency';
}
