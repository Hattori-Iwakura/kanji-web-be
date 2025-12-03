import { BadRequestException, Body, Controller, Get, Param, Post, Put, Delete, NotFoundException, Res } from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { Kanji } from 'generated/prisma';
import { ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/shared/error';
import { CreateKanjiDto, UpdateKanjiDto } from './dtos';
import { Response } from 'express';

@ApiTags('Kanji')
@Controller('kanji')
export class KanjiController {
    constructor(private readonly kanjiService: KanjiService) {}

    @Get()
    async getAll(): Promise<Kanji[]> {
        const result = await this.kanjiService.getAll();
        return result;
    }

    @Get(':id')
    async getKanji(@Param('id') id: number): Promise<Kanji | null> {
        const kanji = await this.kanjiService.findById(id);
        if (!kanji) {
            throw new BadRequestException(ErrorCode.NotFound);
        }
        return kanji;
    }

    @Get('character/:character')
    async getByCharacter(@Param('character') character: string): Promise<Kanji | null> {
        const kanji = await this.kanjiService.findByCharacter(character);
        if (!kanji) {
            throw new BadRequestException(ErrorCode.NotFound);
        }
        return kanji;
    }

    @Put('update/:id')
    async updateKanji(@Param('id') id: number, @Body() data: UpdateKanjiDto): Promise<Kanji | null> {
        const kanji = await this.kanjiService.updateAsync(id, data);
        if (!kanji) {
            throw new BadRequestException(ErrorCode.NotFound);
        }
        return kanji;
    }

    @Post('create')
    async createKanji(@Body() data: CreateKanjiDto): Promise<Kanji> {
        const existingKanji = await this.kanjiService.findByCharacter(data.character);
        if (existingKanji) {
            throw new BadRequestException(ErrorCode.AlreadyExists);
        }
        const kanji = await this.kanjiService.createAsync(data);
        return kanji;
    }

    @Delete(':id')
    async deleteKanji(@Param('id') id: number): Promise<Kanji> {
        const kanji = await this.kanjiService.deleteAsync(id);
        if (!kanji) {
            throw new NotFoundException(ErrorCode.NotFound);
        }
        return kanji;
    }

    @Get('svg/:character')
    async getStrokeSvg(@Param('character') character: string, @Res() res: Response): Promise<void> {
        const unicode = character.charCodeAt(0).toString(16).padStart(5, '0');
        const svgUrl = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${unicode}.svg`;
        
        try {
            const response = await fetch(svgUrl);
            if (!response.ok) {
                throw new NotFoundException('SVG not found');
            }
            const svgContent = await response.text();
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(svgContent);
        } catch (error) {
            throw new NotFoundException('Failed to fetch SVG');
        }
    }

}
