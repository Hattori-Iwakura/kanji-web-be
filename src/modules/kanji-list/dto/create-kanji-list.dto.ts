import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateKanjiListDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  kanjiIds?: number[];
}
