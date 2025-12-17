import { Injectable } from "@nestjs/common";
import { DbClient } from "../db_client/db_client.service";
import { Prisma, KanjiCollections } from "generated/prisma";
import { 
    CreateKanjiListDto, 
    UpdateKanjiListDto, 
    KanjiListQueryDto, 
    CollectionType,
    BulkAddKanjiDto
} from "./dtos";

@Injectable()
export class KanjiListRepository {
    constructor(private readonly dbClient: DbClient) {}

    async findAll(query: KanjiListQueryDto): Promise<{
        collections: (KanjiCollections & {
            _count: { KanjiCollectionItems: number }
        })[];
        total: number;
        page: number;
        limit: number;
    }> {
        const { collection_type, user_id, include_public = true, search, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.KanjiCollectionsWhereInput = {};

        if (collection_type) {
            where.collection_type = collection_type;
        }

        if (user_id) {
            where.OR = [
                { user_id },
                ...(include_public ? [{ is_public: true }] : [])
            ];
        } else if (include_public) {
            where.is_public = true;
        }

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const [collections, total] = await Promise.all([
            this.dbClient.kanjiCollections.findMany({
                where,
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                },
                skip,
                take: limit,
                orderBy: { create_at: 'desc' }
            }),
            this.dbClient.kanjiCollections.count({ where })
        ]);

        return { collections, total, page, limit };
    }

    async findByUserId(userId: number): Promise<any[]> {
        return this.dbClient.kanjiCollections.findMany({
            where: { user_id: userId },
            include: {
                _count: {
                    select: { KanjiCollectionItems: true }
                },
                Users: {
                    select: {
                        id: true,
                        account: true,
                        profile_image: true,
                        UserProfile: {
                            select: {
                                display_name: true
                            }
                        }
                    }
                }
            },
            orderBy: { create_at: 'desc' }
        });
    }

    async findById(id: number, includeKanjis = false): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number };
        KanjiCollectionItems?: any[];
    }) | null> {
        return this.dbClient.kanjiCollections.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { KanjiCollectionItems: true }
                },
                ...(includeKanjis && {
                    KanjiCollectionItems: {
                        include: {
                            Kanji: true
                        },
                        orderBy: [
                            { order_index: 'asc' },
                            { create_at: 'asc' }
                        ]
                    }
                })
            }
        });
    }

    async createAsync(data: CreateKanjiListDto): Promise<KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }> {
        return this.dbClient.kanjiCollections.create({
            data,
            include: {
                _count: {
                    select: { KanjiCollectionItems: true }
                }
            }
        });
    }

    async updateAsync(id: number, data: UpdateKanjiListDto): Promise<KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }> {
        return this.dbClient.kanjiCollections.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: { KanjiCollectionItems: true }
                }
            }
        });
    }

    async deleteAsync(id: number): Promise<KanjiCollections> {
        return this.dbClient.kanjiCollections.delete({
            where: { id }
        });
    }

    async addKanjis(collectionId: number, kanjiIds: number[], orderIndices?: number[]): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        return this.dbClient.$transaction(async (tx) => {
            // Remove existing items if any
            await tx.kanjiCollectionItems.deleteMany({
                where: {
                    collection_id: collectionId,
                    kanji_id: { in: kanjiIds }
                }
            });

            // Add new items
            const items = kanjiIds.map((kanjiId, index) => ({
                collection_id: collectionId,
                kanji_id: kanjiId,
                order_index: orderIndices?.[index] || index
            }));

            await tx.kanjiCollectionItems.createMany({
                data: items
            });

            return tx.kanjiCollections.findUnique({
                where: { id: collectionId },
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                }
            });
        });
    }

    async removeKanjis(collectionId: number, kanjiIds: number[]): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        await this.dbClient.kanjiCollectionItems.deleteMany({
            where: {
                collection_id: collectionId,
                kanji_id: { in: kanjiIds }
            }
        });

        return this.dbClient.kanjiCollections.findUnique({
            where: { id: collectionId },
            include: {
                _count: {
                    select: { KanjiCollectionItems: true }
                }
            }
        });
    }

    async bulkAddKanjis(collectionId: number, filters: BulkAddKanjiDto): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        const { jlpt, grade, top_frequency, search } = filters;
        
        return this.dbClient.$transaction(async (tx) => {
            const where: Prisma.KanjiWhereInput = {};
            
            if (jlpt) where.jlpt = jlpt;
            if (grade) where.grade = grade;
            
            if (search) {
                where.OR = [
                    { character: { contains: search } },
                    { meanings: { contains: search, mode: 'insensitive' } },
                    { kunyomi: { contains: search } },
                    { onyomi: { contains: search } }
                ];
            }

            let orderBy: Prisma.KanjiOrderByWithRelationInput = { character: 'asc' };
            let take: number | undefined;

            if (top_frequency) {
                orderBy = { frequency: 'asc' }; // Lower frequency number = more frequent
                take = top_frequency;
                where.frequency = { not: null }; // Only kanji with frequency data
            }

            // Find kanji based on filters
            const kanjis = await tx.kanji.findMany({
                where,
                select: { id: true },
                orderBy,
                take
            });

            if (kanjis.length === 0) {
                return tx.kanjiCollections.findUnique({
                    where: { id: collectionId },
                    include: {
                        _count: {
                            select: { KanjiCollectionItems: true }
                        }
                    }
                });
            }

            // Get current max order_index
            const maxOrder = await tx.kanjiCollectionItems.findFirst({
                where: { collection_id: collectionId },
                orderBy: { order_index: 'desc' },
                select: { order_index: true }
            });

            const startIndex = (maxOrder?.order_index || -1) + 1;

            // Remove existing items if any
            const kanjiIds = kanjis.map(k => k.id);
            await tx.kanjiCollectionItems.deleteMany({
                where: {
                    collection_id: collectionId,
                    kanji_id: { in: kanjiIds }
                }
            });

            // Add new items
            const items = kanjis.map((kanji, index) => ({
                collection_id: collectionId,
                kanji_id: kanji.id,
                order_index: startIndex + index
            }));

            await tx.kanjiCollectionItems.createMany({
                data: items
            });

            return tx.kanjiCollections.findUnique({
                where: { id: collectionId },
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                }
            });
        });
    }

    // Auto-generate collections
    async generateJLPTList(
        jlptLevel: number, 
        name?: string, 
        description?: string, 
        isPublic = true, 
        userId?: number
    ): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        return this.dbClient.$transaction(async (tx) => {
            // Create collection
            const collection = await tx.kanjiCollections.create({
                data: {
                    name: name || `JLPT N${jlptLevel}`,
                    description: description || `All kanji for JLPT N${jlptLevel} level`,
                    is_public: isPublic,
                    collection_type: CollectionType.JLPT,
                    metadata: { jlpt_level: jlptLevel },
                    user_id: userId
                }
            });

            // Find all kanji for this JLPT level
            const kanjis = await tx.kanji.findMany({
                where: { jlpt: jlptLevel },
                select: { id: true },
                orderBy: { character: 'asc' }
            });

            // Add kanji to collection
            if (kanjis.length > 0) {
                await tx.kanjiCollectionItems.createMany({
                    data: kanjis.map((kanji, index) => ({
                        collection_id: collection.id,
                        kanji_id: kanji.id,
                        order_index: index
                    }))
                });
            }

            return tx.kanjiCollections.findUnique({
                where: { id: collection.id },
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                }
            });
        });
    }

    async generateGradeList(
        gradeLevel: number, 
        name?: string, 
        description?: string, 
        isPublic = true, 
        userId?: number
    ): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        return this.dbClient.$transaction(async (tx) => {
            // Create collection
            const collection = await tx.kanjiCollections.create({
                data: {
                    name: name || `Grade ${gradeLevel} Kanji`,
                    description: description || `All kanji taught in grade ${gradeLevel}`,
                    is_public: isPublic,
                    collection_type: CollectionType.GRADE,
                    metadata: { grade_level: gradeLevel },
                    user_id: userId
                }
            });

            // Find all kanji for this grade
            const kanjis = await tx.kanji.findMany({
                where: { grade: gradeLevel },
                select: { id: true },
                orderBy: { character: 'asc' }
            });

            // Add kanji to collection
            if (kanjis.length > 0) {
                await tx.kanjiCollectionItems.createMany({
                    data: kanjis.map((kanji, index) => ({
                        collection_id: collection.id,
                        kanji_id: kanji.id,
                        order_index: index
                    }))
                });
            }

            return tx.kanjiCollections.findUnique({
                where: { id: collection.id },
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                }
            });
        });
    }

    async generateFrequencyList(
        topCount: number, 
        name?: string, 
        description?: string, 
        isPublic = true, 
        userId?: number
    ): Promise<(KanjiCollections & {
        _count: { KanjiCollectionItems: number }
    }) | null> {
        return this.dbClient.$transaction(async (tx) => {
            // Create collection
            const collection = await tx.kanjiCollections.create({
                data: {
                    name: name || `Top ${topCount} Most Frequent Kanji`,
                    description: description || `The ${topCount} most frequently used kanji`,
                    is_public: isPublic,
                    collection_type: CollectionType.FREQUENCY,
                    metadata: { top_count: topCount },
                    user_id: userId
                }
            });

            // Find top N most frequent kanji
            const kanjis = await tx.kanji.findMany({
                where: { frequency: { not: null } },
                select: { id: true },
                orderBy: { frequency: 'asc' }, // Lower number = more frequent
                take: topCount
            });

            // Add kanji to collection
            if (kanjis.length > 0) {
                await tx.kanjiCollectionItems.createMany({
                    data: kanjis.map((kanji, index) => ({
                        collection_id: collection.id,
                        kanji_id: kanji.id,
                        order_index: index
                    }))
                });
            }

            return tx.kanjiCollections.findUnique({
                where: { id: collection.id },
                include: {
                    _count: {
                        select: { KanjiCollectionItems: true }
                    }
                }
            });
        });
    }
}