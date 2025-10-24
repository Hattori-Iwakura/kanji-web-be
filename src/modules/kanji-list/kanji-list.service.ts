import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { Prisma } from 'generated/prisma';

type PublishRequestStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class KanjiListService {
  constructor(private prisma: PrismaService) {}

  // Get JLPT level lists
  async findByJlpt(jlptLevel: string, userId?: number) {
    // JLPT lists are system lists with specific naming pattern
    const lists = await this.prisma.kanjiList.findMany({
      where: {
        OR: [
          { isPublic: true },
          ...(userId ? [{ userId }] : []),
        ],
        // Match lists with JLPT in name (case insensitive)
        name: {
          contains: jlptLevel,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: true,
        items: { include: { kanji: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      jlptLevel,
      data: lists,
      total: lists.length,
    };
  }

  // Get all lists (public + user's own)
  async findAll(userId?: number, query?: { search?: string; type?: string; limit?: number; offset?: number }) {
    const { search, type, limit = 50, offset = 0 } = query || {};

    const where: Prisma.KanjiListWhereInput = {
      OR: [
        { isPublic: true },
        ...(userId ? [{ userId }] : []),
      ],
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { description: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      }),
      // Filter by type (system lists have userId = null, custom have userId)
      ...(type === 'system' && { userId: null }),
      ...(type === 'custom' && { userId: { not: null } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.kanjiList.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          category: true,
          items: { include: { kanji: true }, orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.kanjiList.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  // Get single list by ID
  async findOne(id: number, userId?: number) {
    const list = await this.prisma.kanjiList.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: true,
        items: {
          include: { kanji: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${id} not found`);
    }

    // Check access permission
    if (!list.isPublic && (!userId || list.userId !== userId)) {
      throw new ForbiddenException('You do not have access to this list');
    }

    return list;
  }

  // Create new list
  async create(
    userId: number,
    data: {
      name: string;
      description?: string;
      categoryId?: number;
      kanjiIds?: number[];
    },
  ) {
    const { name, description, categoryId, kanjiIds = [] } = data;

    // Verify category exists if provided
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException(
          `Category with ID ${categoryId} not found`,
        );
      }
    }

    // Verify all kanji exist
    if (kanjiIds.length > 0) {
      const kanjiCount = await this.prisma.kanji.count({
        where: { id: { in: kanjiIds } },
      });
      if (kanjiCount !== kanjiIds.length) {
        throw new BadRequestException('Some kanji IDs are invalid');
      }
    }

    return this.prisma.kanjiList.create({
      data: {
        name,
        description,
        categoryId,
        userId, // User-created lists always have userId
        items: {
          create: kanjiIds.map((kanjiId, index) => ({
            kanjiId,
            order: index,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: true,
        items: {
          include: { kanji: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  // Update list
  async update(
    id: number,
    userId: number,
    data: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      categoryId?: number;
    },
  ) {
    const list = await this.prisma.kanjiList.findUnique({ where: { id } });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${id} not found`);
    }

    // System lists (userId = null) cannot be modified
    if (list.userId === null) {
      throw new ForbiddenException('Cannot modify system lists');
    }

    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this list');
    }

    // Verify category exists if provided
    if (data.categoryId !== undefined) {
      if (data.categoryId === null) {
        // Allow setting to null
      } else {
        const category = await this.prisma.category.findUnique({
          where: { id: data.categoryId },
        });
        if (!category) {
          throw new BadRequestException(
            `Category with ID ${data.categoryId} not found`,
          );
        }
      }
    }

    return this.prisma.kanjiList.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        category: true,
        items: {
          include: { kanji: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  // Delete list
  async delete(id: number, userId: number) {
    const list = await this.prisma.kanjiList.findUnique({ where: { id } });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${id} not found`);
    }

    // System lists (userId = null) cannot be deleted
    if (list.userId === null) {
      throw new ForbiddenException('Cannot delete system lists');
    }

    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this list');
    }

    await this.prisma.kanjiList.delete({ where: { id } });
    return { message: 'List deleted successfully' };
  }

  // Add kanji to list
  async addKanji(listId: number, userId: number, kanjiId: number) {
    const list = await this.prisma.kanjiList.findUnique({
      where: { id: listId },
      include: { items: true },
    });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${listId} not found`);
    }

    // System lists cannot be modified
    if (list.userId === null) {
      throw new ForbiddenException('Cannot modify system lists');
    }

    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this list');
    }

    // Verify kanji exists
    const kanji = await this.prisma.kanji.findUnique({ where: { id: kanjiId } });
    if (!kanji) {
      throw new NotFoundException(`Kanji with ID ${kanjiId} not found`);
    }

    // Check if already in list
    const existing = await this.prisma.kanjiListItem.findUnique({
      where: { listId_kanjiId: { listId, kanjiId } },
    });

    if (existing) {
      throw new BadRequestException('Kanji already in list');
    }

    // Get max order
    const maxOrder = list.items.reduce((max, item) => Math.max(max, item.order), -1);

    await this.prisma.kanjiListItem.create({
      data: {
        listId,
        kanjiId,
        order: maxOrder + 1,
      },
    });

    return this.findOne(listId, userId);
  }

  // Remove kanji from list
  async removeKanji(listId: number, userId: number, kanjiId: number) {
    const list = await this.prisma.kanjiList.findUnique({ where: { id: listId } });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${listId} not found`);
    }

    // System lists cannot be modified
    if (list.userId === null) {
      throw new ForbiddenException('Cannot modify system lists');
    }

    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this list');
    }

    const item = await this.prisma.kanjiListItem.findUnique({
      where: { listId_kanjiId: { listId, kanjiId } },
    });

    if (!item) {
      throw new NotFoundException('Kanji not found in list');
    }

    await this.prisma.kanjiListItem.delete({
      where: { listId_kanjiId: { listId, kanjiId } },
    });

    return this.findOne(listId, userId);
  }

  // Submit list for publication (user request)
  async requestPublish(listId: number, userId: number) {
    const list = await this.prisma.kanjiList.findUnique({
      where: { id: listId },
      include: { items: true },
    });

    if (!list) {
      throw new NotFoundException(`KanjiList with ID ${listId} not found`);
    }

    // System lists cannot request publish (already public)
    if (list.userId === null) {
      throw new BadRequestException('System lists are already public');
    }

    if (list.userId !== userId) {
      throw new ForbiddenException('You do not own this list');
    }

    if (list.isPublic) {
      throw new BadRequestException('List is already public');
    }

    if (list.items.length === 0) {
      throw new BadRequestException('Cannot publish empty list');
    }

    // Check for existing pending request
    const existingRequest = await this.prisma.kanjiListPublishRequest.findFirst({
      where: {
        listId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Publish request already pending');
    }

    return this.prisma.kanjiListPublishRequest.create({
      data: {
        listId,
        userId,
        status: 'pending',
      },
    });
  }

  // Admin: Get all publish requests
  async getPublishRequests(status?: PublishRequestStatus) {
    return this.prisma.kanjiListPublishRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: Approve publish request
  async approvePublishRequest(requestId: number, adminId: number) {
    const request = await this.prisma.kanjiListPublishRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    await this.prisma.$transaction([
      this.prisma.kanjiList.update({
        where: { id: request.listId },
        data: { isPublic: true },
      }),
      this.prisma.kanjiListPublishRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Publish request approved', listId: request.listId };
  }

  // Admin: Reject publish request
  async rejectPublishRequest(requestId: number, adminId: number, reason?: string) {
    const request = await this.prisma.kanjiListPublishRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Publish request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    await this.prisma.kanjiListPublishRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        message: reason, // Use message field for rejection reason
      },
    });

    return { message: 'Publish request rejected' };
  }
}
