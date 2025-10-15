import { BadRequestException, Body, Controller, Get, Param, Post, Put, Delete, NotFoundException } from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { Kanji } from 'generated/prisma';
import { ApiTags } from '@nestjs/swagger';
import { ErrorCode } from 'src/shared/error';
import { CreateKanjiDto, UpdateKanjiDto } from './dtos';

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

}
