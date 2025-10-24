import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class KanjiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { jlpt?: number; grade?: number; search?: string; limit?: number; offset?: number }) {
    const { jlpt, grade, search, limit = 50, offset = 0 } = query || {};
    
    const where: any = {};
    if (jlpt) where.jlpt = jlpt;
    if (grade) where.grade = grade;
    if (search) {
      where.OR = [
        { character: { contains: search } },
        { meanings: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [kanji, total] = await Promise.all([
      this.prisma.kanji.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { frequency: 'asc' },
      }),
      this.prisma.kanji.count({ where }),
    ]);

    return { data: kanji, total, limit, offset };
  }

  async searchKanji(params: {
    query?: string;
    jlptLevels?: number[];
    grades?: number[];
    minStrokes?: number;
    maxStrokes?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    const { query, jlptLevels, grades, minStrokes, maxStrokes, page = 1, limit = 20, sortBy } = params;

    const where: any = {};

    // Text search
    if (query) {
      where.OR = [
        { character: { equals: query } },
        { meanings: { contains: query, mode: 'insensitive' } },
        { onyomi: { contains: query, mode: 'insensitive' } },
        { kunyomi: { contains: query, mode: 'insensitive' } },
      ];
    }

    // JLPT filter
    if (jlptLevels && jlptLevels.length > 0) {
      where.jlpt = { in: jlptLevels };
    }

    // Grade filter
    if (grades && grades.length > 0) {
      where.grade = { in: grades };
    }

    // Stroke count range
    if (minStrokes !== undefined || maxStrokes !== undefined) {
      where.strokeCount = {};
      if (minStrokes !== undefined) where.strokeCount.gte = minStrokes;
      if (maxStrokes !== undefined) where.strokeCount.lte = maxStrokes;
    }

    // Sorting
    let orderBy: any = { frequency: 'asc' }; // default
    if (sortBy === 'strokes') {
      orderBy = { strokeCount: 'asc' };
    } else if (sortBy === 'jlpt') {
      orderBy = { jlpt: 'desc' };
    } else if (sortBy === 'grade') {
      orderBy = { grade: 'asc' };
    }

    const offset = (page - 1) * limit;

    const [kanji, total] = await Promise.all([
      this.prisma.kanji.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
      }),
      this.prisma.kanji.count({ where }),
    ]);

    return {
      data: kanji,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const kanji = await this.prisma.kanji.findUnique({
      where: { id },
    });

    if (!kanji) {
      throw new NotFoundException(`Kanji with ID ${id} not found`);
    }

    return kanji;
  }

  async findByCharacter(character: string) {
    const kanji = await this.prisma.kanji.findUnique({
      where: { character },
    });

    if (!kanji) {
      throw new NotFoundException(`Kanji ${character} not found`);
    }

    return kanji;
  }

  async create(data: any) {
    // Convert arrays to strings (client sends arrays, DB stores strings)
    const processedData = {
      character: data.character,
      meanings: Array.isArray(data.meanings) ? data.meanings.join(', ') : data.meanings,
      onyomi: Array.isArray(data.onyomi) ? data.onyomi.join('、') : data.onyomi,
      kunyomi: Array.isArray(data.kunyomi) ? data.kunyomi.join('、') : data.kunyomi,
      strokeCount: data.strokeCount,
      jlpt: data.jlpt || data.jlptLevel, // Accept both jlpt (number) and jlptLevel (string "N5")
      grade: data.grade,
      frequency: data.frequency,
    };

    // Convert jlptLevel string to jlpt number if needed
    if (typeof processedData.jlpt === 'string' && processedData.jlpt.startsWith('N')) {
      processedData.jlpt = parseInt(processedData.jlpt.substring(1));
    }

    return this.prisma.kanji.create({ data: processedData });
  }

  async update(id: number, data: any) {
    const kanji = await this.findOne(id);
    
    // Convert arrays to strings
    const processedData: any = {};
    
    if (data.meanings) {
      processedData.meanings = Array.isArray(data.meanings) ? data.meanings.join(', ') : data.meanings;
    }
    if (data.onyomi !== undefined) {
      processedData.onyomi = Array.isArray(data.onyomi) ? data.onyomi.join('、') : data.onyomi;
    }
    if (data.kunyomi !== undefined) {
      processedData.kunyomi = Array.isArray(data.kunyomi) ? data.kunyomi.join('、') : data.kunyomi;
    }
    if (data.jlpt !== undefined || data.jlptLevel !== undefined) {
      processedData.jlpt = data.jlpt || data.jlptLevel;
      // Convert jlptLevel string to jlpt number
      if (typeof processedData.jlpt === 'string' && processedData.jlpt.startsWith('N')) {
        processedData.jlpt = parseInt(processedData.jlpt.substring(1));
      }
    }
    if (data.grade !== undefined) processedData.grade = data.grade;
    if (data.strokeCount !== undefined) processedData.strokeCount = data.strokeCount;
    if (data.frequency !== undefined) processedData.frequency = data.frequency;

    return this.prisma.kanji.update({
      where: { id },
      data: processedData,
    });
  }

  async delete(id: number) {
    const kanji = await this.findOne(id);
    return this.prisma.kanji.delete({ where: { id } });
  }
}
