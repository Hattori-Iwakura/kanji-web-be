import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from "class-validator";

export class CreateKanjiDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    character: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    onyomi?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    kunyomi?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    meanings: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    meaning_explanation?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    stroke_count?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    jlpt?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    grade?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    frequency?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString({ each: true })
    radicals?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    level_id?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @IsArray()
    category_id?: number[];
}

export class UpdateKanjiDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    character?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    onyomi?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    kunyomi?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    meanings?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    meaning_explanation?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    stroke_count?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    jlpt?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    grade?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    frequency?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString({ each: true })
    radicals?: string;
}

export class DeleteKanjiDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    id: number;
}
