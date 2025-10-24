import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { KanjiListService } from './kanji-list.service';
import { PrismaService } from '../../shared/services/prisma.service';

describe('KanjiListService', () => {
  let service: KanjiListService;
  let prisma: PrismaService;

  const mockPrismaService = {
    kanjiList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    kanji: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    kanjiListItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    kanjiListPublishRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KanjiListService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<KanjiListService>(KanjiListService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return public lists when no userId provided', async () => {
      const mockLists = [
        { id: 1, name: 'Public List', isPublic: true, userId: 1, items: [] },
      ];
      mockPrismaService.kanjiList.findMany.mockResolvedValue(mockLists);
      mockPrismaService.kanjiList.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toEqual(mockLists);
      expect(result.total).toBe(1);
      expect(mockPrismaService.kanjiList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ isPublic: true }] },
        })
      );
    });

    it('should return public + own lists when userId provided', async () => {
      const mockLists = [
        { id: 1, name: 'Public List', isPublic: true, userId: 1, items: [] },
        { id: 2, name: 'My List', isPublic: false, userId: 2, items: [] },
      ];
      mockPrismaService.kanjiList.findMany.mockResolvedValue(mockLists);
      mockPrismaService.kanjiList.count.mockResolvedValue(2);

      const result = await service.findAll(2);

      expect(result.data).toEqual(mockLists);
      expect(mockPrismaService.kanjiList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ isPublic: true }, { userId: 2 }],
          },
        })
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.kanjiList.findMany.mockResolvedValue([]);
      mockPrismaService.kanjiList.count.mockResolvedValue(0);

      await service.findAll(undefined, { search: 'test' });

      expect(mockPrismaService.kanjiList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaService.kanjiList.findMany.mockResolvedValue([]);
      mockPrismaService.kanjiList.count.mockResolvedValue(0);

      await service.findAll(undefined, { limit: 10, offset: 5 });

      expect(mockPrismaService.kanjiList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return public list', async () => {
      const mockList = { id: 1, name: 'Public', isPublic: true, userId: 1, items: [] };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      const result = await service.findOne(1);

      expect(result).toEqual(mockList);
    });

    it('should return own private list', async () => {
      const mockList = { id: 1, name: 'Private', isPublic: false, userId: 2, items: [] };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      const result = await service.findOne(1, 2);

      expect(result).toEqual(mockList);
    });

    it('should throw NotFoundException when list not found', async () => {
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing other user private list', async () => {
      const mockList = { id: 1, name: 'Private', isPublic: false, userId: 1 };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      await expect(service.findOne(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create list with kanji', async () => {
      const mockList = {
        id: 1,
        name: 'New List',
        userId: 1,
        isPublic: false,
        items: [
          { kanji: { id: 1, character: '一' }, order: 0 },
          { kanji: { id: 2, character: '二' }, order: 1 },
        ],
      };

      mockPrismaService.kanji.count.mockResolvedValue(2);
      mockPrismaService.kanjiList.create.mockResolvedValue(mockList);

      const result = await service.create(1, {
        name: 'New List',
        kanjiIds: [1, 2],
      });

      expect(result).toEqual(mockList);
      expect(mockPrismaService.kanji.count).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });

    it('should throw BadRequestException when kanji IDs invalid', async () => {
      mockPrismaService.kanji.count.mockResolvedValue(1);

      await expect(
        service.create(1, { name: 'Test', kanjiIds: [1, 999] })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update own list', async () => {
      const mockList = { id: 1, userId: 1, isPublic: false };
      const mockUpdated = { ...mockList, name: 'Updated' };

      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiList.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, 1, { name: 'Updated' });

      expect(result).toEqual(mockUpdated);
    });

    it('should throw ForbiddenException when updating other user list', async () => {
      const mockList = { id: 1, userId: 1, isPublic: false };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      await expect(service.update(1, 2, { name: 'Hack' })).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete own list', async () => {
      const mockList = { id: 1, userId: 1 };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiList.delete.mockResolvedValue(mockList);

      await service.delete(1, 1);

      expect(mockPrismaService.kanjiList.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ForbiddenException when deleting other user list', async () => {
      const mockList = { id: 1, userId: 1 };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addKanji', () => {
    it('should add kanji to list', async () => {
      const mockList = { id: 1, userId: 1, items: [] };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanji.findUnique.mockResolvedValue({ id: 1, character: '一' });
      mockPrismaService.kanjiListItem.findUnique.mockResolvedValue(null);
      mockPrismaService.kanjiListItem.aggregate.mockResolvedValue({ _max: { order: null } });
      mockPrismaService.kanjiListItem.create.mockResolvedValue({});
      mockPrismaService.kanjiList.findUnique.mockResolvedValue({
        ...mockList,
        items: [{ kanji: { id: 1 } }],
      });

      const result = await service.addKanji(1, 1, 1);

      expect(mockPrismaService.kanjiListItem.create).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('should throw BadRequestException when kanji already in list', async () => {
      const mockList = { id: 1, userId: 1 };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanji.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.kanjiListItem.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.addKanji(1, 1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeKanji', () => {
    it('should remove kanji from list', async () => {
      const mockList = { id: 1, userId: 1, items: [{ kanji: { id: 1 } }] };
      const mockItem = { id: 1, listId: 1, kanjiId: 1 };

      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiListItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.kanjiListItem.delete.mockResolvedValue(mockItem);
      mockPrismaService.kanjiList.findUnique.mockResolvedValue({
        ...mockList,
        items: [],
      });

      const result = await service.removeKanji(1, 1, 1);

      expect(mockPrismaService.kanjiListItem.delete).toHaveBeenCalledWith({
        where: { listId_kanjiId: { listId: 1, kanjiId: 1 } },
      });
      expect(result.items).toHaveLength(0);
    });

    it('should throw NotFoundException when kanji not in list', async () => {
      const mockList = { id: 1, userId: 1 };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiListItem.findUnique.mockResolvedValue(null);

      await expect(service.removeKanji(1, 1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestPublish', () => {
    it('should create publish request', async () => {
      const mockList = { id: 1, userId: 1, isPublic: false, items: [{ id: 1 }] };
      const mockRequest = { id: 1, listId: 1, userId: 1, status: 'pending' };

      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiListPublishRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.kanjiListPublishRequest.create.mockResolvedValue(mockRequest);

      const result = await service.requestPublish(1, 1);

      expect(result).toEqual(mockRequest);
      expect(mockPrismaService.kanjiListPublishRequest.create).toHaveBeenCalledWith({
        data: {
          listId: 1,
          userId: 1,
          status: 'pending',
        },
      });
    });

    it('should throw BadRequestException when list is empty', async () => {
      const mockList = { id: 1, userId: 1, items: [] };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);

      await expect(service.requestPublish(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pending request exists', async () => {
      const mockList = { id: 1, userId: 1, items: [{ id: 1 }] };
      mockPrismaService.kanjiList.findUnique.mockResolvedValue(mockList);
      mockPrismaService.kanjiListPublishRequest.findFirst.mockResolvedValue({
        id: 1,
        status: 'pending',
      });

      await expect(service.requestPublish(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approvePublishRequest', () => {
    it('should approve request and make list public', async () => {
      const mockRequest = { id: 1, listId: 1, status: 'pending' };

      mockPrismaService.kanjiListPublishRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.$transaction.mockImplementation(async (operations) => {
        // Execute all operations in the transaction
        for (const op of operations) {
          await op;
        }
      });
      mockPrismaService.kanjiList.update.mockResolvedValue({ id: 1, isPublic: true });
      mockPrismaService.kanjiListPublishRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'approved',
        reviewedBy: 2,
      });

      const result = await service.approvePublishRequest(1, 2);

      expect(result).toEqual({ message: 'Publish request approved', listId: 1 });
      expect(mockPrismaService.kanjiList.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isPublic: true },
      });
    });

    it('should throw BadRequestException when request not pending', async () => {
      const mockRequest = { id: 1, status: 'approved' };
      mockPrismaService.kanjiListPublishRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.approvePublishRequest(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('rejectPublishRequest', () => {
    it('should reject request with reason', async () => {
      const mockRequest = { id: 1, status: 'pending' };

      mockPrismaService.kanjiListPublishRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.kanjiListPublishRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'rejected',
        reviewedBy: 2,
        message: 'Not good enough',
      });

      const result = await service.rejectPublishRequest(1, 2, 'Not good enough');

      expect(result).toEqual({ message: 'Publish request rejected' });
      expect(mockPrismaService.kanjiListPublishRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'rejected',
          reviewedBy: 2,
          reviewedAt: expect.any(Date),
          message: 'Not good enough',
        },
      });
    });
  });
});
