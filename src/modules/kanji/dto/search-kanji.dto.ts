import { IsString, IsOptional, IsArray, IsInt, Min, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchKanjiDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  jlptLevels?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  grades?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minStrokes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStrokes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['character', 'strokes', 'jlpt', 'grade'])
  sortBy?: string;
}
