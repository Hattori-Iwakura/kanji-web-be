import { Injectable } from '@nestjs/common';
import { KanjiCollections } from 'generated/prisma';
import { KanjiListRepository } from './kanji_list.repo';
import { 
    CreateKanjiListDto, 
    UpdateKanjiListDto, 
    KanjiListQueryDto, 
    AddKanjiToListDto,
    GenerateJLPTListDto,
    GenerateGradeListDto,
    GenerateFrequencyListDto,
    BulkAddKanjiDto
} from './dtos';

@Injectable()
export class KanjiListService {
    constructor(
        private readonly kanjiListRepository: KanjiListRepository,
    ) {}

    async getAll(query: KanjiListQueryDto): Promise<{
        data: (KanjiCollections & { kanji_count: number })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }> {
        const result = await this.kanjiListRepository.findAll(query);
        
        const collections = result.collections.map(collection => ({
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        }));

        return {
            data: collections,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit)
            }
        };
    }

    async getById(id: number, includeKanjis = false): Promise<(KanjiCollections & { 
        kanji_count: number; 
        kanjis?: any[] 
    }) | null> {
        const collection = await this.kanjiListRepository.findById(id, includeKanjis);
        
        if (!collection) {
            return null;
        }

        const result = {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };

        if (includeKanjis && collection.KanjiCollectionItems) {
            (result as any).kanjis = collection.KanjiCollectionItems.map(item => item.Kanji);
        }

        return result;
    }

    async createAsync(data: CreateKanjiListDto): Promise<KanjiCollections & { kanji_count: number }> {
        const collection = await this.kanjiListRepository.createAsync(data);
        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async updateAsync(id: number, data: UpdateKanjiListDto): Promise<KanjiCollections & { kanji_count: number }> {
        const collection = await this.kanjiListRepository.updateAsync(id, data);
        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async deleteAsync(id: number): Promise<KanjiCollections> {
        return this.kanjiListRepository.deleteAsync(id);
    }

    async addKanjis(listId: number, data: AddKanjiToListDto): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.addKanjis(
            listId, 
            data.kanji_ids, 
            data.order_indices
        );
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async removeKanjis(listId: number, kanjiIds: number[]): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.removeKanjis(listId, kanjiIds);
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async bulkAddKanjis(listId: number, filters: BulkAddKanjiDto): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.bulkAddKanjis(listId, filters);
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    // Auto-generate collections
    async generateJLPTList(data: GenerateJLPTListDto, userId?: number): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.generateJLPTList(
            data.jlpt_level,
            data.name,
            data.description,
            data.is_public,
            userId
        );
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async generateGradeList(data: GenerateGradeListDto, userId?: number): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.generateGradeList(
            data.grade_level,
            data.name,
            data.description,
            data.is_public,
            userId
        );
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }

    async generateFrequencyList(data: GenerateFrequencyListDto, userId?: number): Promise<(KanjiCollections & { kanji_count: number }) | null> {
        const collection = await this.kanjiListRepository.generateFrequencyList(
            data.top_count,
            data.name,
            data.description,
            data.is_public,
            userId
        );
        
        if (!collection) return null;

        return {
            ...collection,
            kanji_count: collection._count.KanjiCollectionItems
        };
    }
}
