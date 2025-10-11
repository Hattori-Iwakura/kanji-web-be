import { Injectable } from '@nestjs/common';
import { Prisma, Kanji } from 'generated/prisma';
import { KanjiRepository } from './kanji.repo';
import { CreateKanjiDto, UpdateKanjiDto } from './dtos';

@Injectable()
export class KanjiService {
    constructor(
        private readonly kanjiRepository: KanjiRepository,
    ) {}

    async getAll(): Promise<Kanji[]> {
        const result = await this.kanjiRepository.fetchAllAsync();
        return result;
    }

    async findById(id: number): Promise<Kanji| null> {
        const kanji = await this.kanjiRepository.fetchAsync({id: id});
        return kanji;
    }

    async findByCharacter(character: string): Promise<Kanji| null> {
        const kanji = await this.kanjiRepository.fetchAsync({character: character});
        return kanji;
    }

    async updateAsync(id: number, info: UpdateKanjiDto): Promise<Kanji | null> {
        const kanji = await this.kanjiRepository.updateAsync(id, info);
        return kanji;
    }

    async createAsync(info: CreateKanjiDto): Promise<Kanji> {
        const kanji = await this.kanjiRepository.createAsync(info);
        return kanji;
    }

    async deleteAsync(id: number): Promise<Kanji> {
        const kanji = await this.kanjiRepository.deleteAsync(id);
        return kanji;
    }
}