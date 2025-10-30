import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class KanjiService {
  private readonly CNN_API_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

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

    try {
      return await this.prisma.kanji.create({ data: processedData });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new Error(`Kanji character '${processedData.character}' already exists in the database`);
      }
      throw error;
    }
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

  async searchByCanvas(base64Image: string) {
    try {
      // Call CNN API to predict kanji from canvas drawing
      const response = await fetch(`${this.CNN_API_URL}/api/v1/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          `CNN API error: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const prediction = await response.json();

      // Extract top 5 predictions (character only, no confidence as requested)
      const top5Characters = prediction.top5?.map((item: any) => item.character) || [];

      // Get full kanji data for top 5 predictions from database
      const kanjiResults = await this.prisma.kanji.findMany({
        where: {
          character: {
            in: top5Characters,
          },
        },
      });

      // Sort results to match prediction order
      const sortedResults = top5Characters
        .map((char: string) => kanjiResults.find((k) => k.character === char))
        .filter((k) => k !== undefined);

      return {
        predictions: sortedResults,
        total: sortedResults.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to predict kanji: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
