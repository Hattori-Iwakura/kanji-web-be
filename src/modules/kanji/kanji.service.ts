import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Kanji } from 'generated/prisma';
import { KanjiRepository } from './kanji.repo';
import { CreateKanjiDto, UpdateKanjiDto } from './dtos';
import { SearchKanjiDto } from './dto/search-kanji.dto';
import {
  CreateKanjiListDto,
  AddToListDto,
  UpdateListItemDto,
  ReorderListDto,
} from './dto/kanji-list.dto';
import {
  UpdateProgressDto,
  RecordReviewDto,
} from './dto/kanji-progress.dto';

@Injectable()
export class KanjiService {
  constructor(private readonly kanjiRepository: KanjiRepository) {}

  async getAll(): Promise<Kanji[]> {
    const result = await this.kanjiRepository.fetchAllAsync();
    return result;
  }

  async findById(id: number): Promise<Kanji | null> {
    const kanji = await this.kanjiRepository.fetchAsync({ id: id });
    return kanji;
  }

  async findByCharacter(character: string): Promise<Kanji | null> {
    const kanji = await this.kanjiRepository.fetchAsync({
      character: character,
    });
    return kanji;
  }

  async updateAsync(
    id: number,
    info: UpdateKanjiDto,
  ): Promise<Kanji | null> {
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

  // ==================== Search & Filter ====================
  async searchKanji(dto: SearchKanjiDto) {
    const where: Prisma.KanjiWhereInput = {};

    // Text search in character, meanings, readings
    if (dto.query) {
      where.OR = [
        { character: { contains: dto.query, mode: 'insensitive' } },
        { meanings: { contains: dto.query, mode: 'insensitive' } },
        { onyomi: { contains: dto.query, mode: 'insensitive' } },
        { kunyomi: { contains: dto.query, mode: 'insensitive' } },
      ];
    }

    // Filter by JLPT levels
    if (dto.jlptLevels && dto.jlptLevels.length > 0) {
      where.jlpt = { in: dto.jlptLevels };
    }

    // Filter by grades
    if (dto.grades && dto.grades.length > 0) {
      where.grade = { in: dto.grades };
    }

    // Filter by stroke count range
    if (dto.minStrokes || dto.maxStrokes) {
      where.stroke_count = {
        ...(dto.minStrokes && { gte: dto.minStrokes }),
        ...(dto.maxStrokes && { lte: dto.maxStrokes }),
      };
    }

    // Filter by radical
    if (dto.radical) {
      where.radicals = { contains: dto.radical };
    }

    // Get sort order
    const orderBy = this.getOrderBy(dto.sortBy);

    // Calculate pagination
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    // Fetch data
    const [kanji, total] = await Promise.all([
      this.kanjiRepository.db.kanji.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.kanjiRepository.db.kanji.count({ where }),
    ]);

    return {
      data: kanji,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getOrderBy(sortBy?: string): Prisma.KanjiOrderByWithRelationInput {
    switch (sortBy) {
      case 'frequency':
        return { frequency: 'asc' };
      case 'strokes':
        return { stroke_count: 'asc' };
      case 'grade':
        return { grade: 'asc' };
      case 'jlpt':
        return { jlpt: 'desc' };
      case 'alphabetical':
        return { character: 'asc' };
      default:
        return { frequency: 'asc' };
    }
  }

  // ==================== Kanji Detail with Examples ====================
  async getKanjiDetail(character: string, userId?: number) {
    const kanji = await this.kanjiRepository.db.kanji.findUnique({
      where: { character },
      include: {
        Examples: {
          take: 10,
          orderBy: { frequency: 'asc' },
        },
        Progress: userId
          ? {
              where: { user_id: userId },
              take: 1,
            }
          : false,
      },
    });

    if (!kanji) {
      throw new NotFoundException(`Kanji ${character} not found`);
    }

    return kanji;
  }

  async getKanjiExamples(character: string, limit: number = 10) {
    const kanji = await this.kanjiRepository.fetchAsync({ character });
    if (!kanji) {
      throw new NotFoundException(`Kanji ${character} not found`);
    }

    const examples = await this.kanjiRepository.db.kanjiExample.findMany({
      where: { kanji_id: kanji.id },
      take: limit,
      orderBy: { frequency: 'asc' },
    });

    return examples;
  }

  // ==================== Kanji Lists ====================
  async createList(userId: number, dto: CreateKanjiListDto) {
    const list = await this.kanjiRepository.db.kanjiList.create({
      data: {
        user_id: userId,
        name: dto.name,
        description: dto.description,
        is_public: dto.isPublic || false,
      },
    });

    return list;
  }

  async getUserLists(userId: number) {
    const lists = await this.kanjiRepository.db.kanjiList.findMany({
      where: { user_id: userId },
      include: {
        Items: {
          take: 5,
          include: { Kanji: true },
        },
        _count: {
          select: { Items: true },
        },
      },
      orderBy: { create_at: 'desc' },
    });

    return lists;
  }

  async getListDetail(listId: number, userId: number) {
    const list = await this.kanjiRepository.db.kanjiList.findFirst({
      where: { id: listId, user_id: userId },
      include: {
        Items: {
          include: { Kanji: true },
          orderBy: { order_index: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    return list;
  }

  async addKanjiToList(userId: number, dto: AddToListDto) {
    // Verify list ownership
    const list = await this.kanjiRepository.db.kanjiList.findFirst({
      where: { id: dto.listId, user_id: userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    // Get max order index
    const maxOrder = await this.kanjiRepository.db.kanjiListItem.aggregate({
      where: { list_id: dto.listId },
      _max: { order_index: true },
    });

    let currentIndex = (maxOrder._max.order_index || 0) + 1;

    // Find kanji by characters
    const kanjiList = await this.kanjiRepository.db.kanji.findMany({
      where: { character: { in: dto.kanjiCharacters } },
    });

    if (kanjiList.length === 0) {
      throw new BadRequestException('No valid kanji found');
    }

    // Add items
    const items = await Promise.all(
      kanjiList.map((kanji) =>
        this.kanjiRepository.db.kanjiListItem.upsert({
          where: {
            list_id_kanji_id: {
              list_id: dto.listId,
              kanji_id: kanji.id,
            },
          },
          create: {
            list_id: dto.listId,
            kanji_id: kanji.id,
            order_index: currentIndex++,
            notes: dto.notes,
          },
          update: {},
        }),
      ),
    );

    return { added: items.length };
  }

  async removeFromList(listId: number, kanjiId: number, userId: number) {
    // Verify ownership
    const list = await this.kanjiRepository.db.kanjiList.findFirst({
      where: { id: listId, user_id: userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    await this.kanjiRepository.db.kanjiListItem.delete({
      where: {
        list_id_kanji_id: {
          list_id: listId,
          kanji_id: kanjiId,
        },
      },
    });

    return { success: true };
  }

  async deleteList(userId: number, listId: number) {
    const list = await this.kanjiRepository.db.kanjiList.findFirst({
      where: { id: listId, user_id: userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    await this.kanjiRepository.db.kanjiList.delete({
      where: { id: listId },
    });

    return { success: true };
  }

  async reorderList(userId: number, listId: number, dto: ReorderListDto) {
    const list = await this.kanjiRepository.db.kanjiList.findFirst({
      where: { id: listId, user_id: userId },
    });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    // Update order indexes
    await Promise.all(
      dto.kanjiIds.map((kanjiId, index) =>
        this.kanjiRepository.db.kanjiListItem.update({
          where: {
            list_id_kanji_id: {
              list_id: listId,
              kanji_id: kanjiId,
            },
          },
          data: { order_index: index },
        }),
      ),
    );

    return { success: true };
  }

  // ==================== Progress Tracking ====================
  async getUserProgress(userId: number) {
    const progress = await this.kanjiRepository.db.kanjiProgress.groupBy({
      by: ['status'],
      where: { user_id: userId },
      _count: true,
    });

    const result = {
      new: 0,
      learning: 0,
      known: 0,
      mastered: 0,
    };

    progress.forEach((p) => {
      result[p.status] = p._count;
    });

    return result;
  }

  async updateProgress(userId: number, dto: UpdateProgressDto) {
    const kanji = await this.kanjiRepository.fetchAsync({
      character: dto.character,
    });

    if (!kanji) {
      throw new NotFoundException('Kanji not found');
    }

    const progress = await this.kanjiRepository.db.kanjiProgress.upsert({
      where: {
        user_id_kanji_id: {
          user_id: userId,
          kanji_id: kanji.id,
        },
      },
      create: {
        user_id: userId,
        kanji_id: kanji.id,
        status: dto.status,
        first_learned: new Date(),
        ...(dto.status === 'mastered' && { mastered_at: new Date() }),
      },
      update: {
        status: dto.status,
        ...(dto.status === 'mastered' && { mastered_at: new Date() }),
      },
    });

    return progress;
  }

  async recordReview(userId: number, dto: RecordReviewDto) {
    const kanji = await this.kanjiRepository.fetchAsync({
      character: dto.character,
    });

    if (!kanji) {
      throw new NotFoundException('Kanji not found');
    }

    const progress = await this.kanjiRepository.db.kanjiProgress.upsert({
      where: {
        user_id_kanji_id: {
          user_id: userId,
          kanji_id: kanji.id,
        },
      },
      create: {
        user_id: userId,
        kanji_id: kanji.id,
        status: dto.correct ? 'learning' : 'new',
        times_reviewed: 1,
        times_correct: dto.correct ? 1 : 0,
        last_reviewed: new Date(),
      },
      update: {
        times_reviewed: { increment: 1 },
        times_correct: { increment: dto.correct ? 1 : 0 },
        last_reviewed: new Date(),
      },
    });

    return progress;
  }

  async getKanjiProgress(userId: number, character: string) {
    const kanji = await this.kanjiRepository.fetchAsync({ character });
    if (!kanji) {
      throw new NotFoundException('Kanji not found');
    }

    const progress = await this.kanjiRepository.db.kanjiProgress.findUnique({
      where: {
        user_id_kanji_id: {
          user_id: userId,
          kanji_id: kanji.id,
        },
      },
    });

    return progress || null;
  }
}