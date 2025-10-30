import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllKanjiDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jlpt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  grade?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
