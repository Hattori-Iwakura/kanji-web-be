import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FlashcardDeckService } from './flashcard-deck.service';
import { PrismaService } from '../../shared/services/prisma.service';

describe('FlashcardDeckService', () => {
  let service: FlashcardDeckService;
  let prisma: PrismaService;

  const mockPrismaService = {
    flashcardDeck: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    kanji: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    flashcardCard: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    flashcardDeckPublishRequest: {
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
        FlashcardDeckService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardDeckService>(FlashcardDeckService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return public decks when no userId provided', async () => {
      const mockDecks = [
        { id: 1, name: 'Public Deck', isPublic: true, userId: 1, cards: [] },
      ];
      mockPrismaService.flashcardDeck.findMany.mockResolvedValue(mockDecks);
      mockPrismaService.flashcardDeck.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toEqual(mockDecks);
      expect(result.total).toBe(1);
      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ isPublic: true }] },
        })
      );
    });

    it('should return public + own decks when userId provided', async () => {
      const mockDecks = [
        { id: 1, name: 'Public Deck', isPublic: true, userId: 1, cards: [] },
        { id: 2, name: 'My Deck', isPublic: false, userId: 2, cards: [] },
      ];
      mockPrismaService.flashcardDeck.findMany.mockResolvedValue(mockDecks);
      mockPrismaService.flashcardDeck.count.mockResolvedValue(2);

      const result = await service.findAll(2);

      expect(result.data).toEqual(mockDecks);
      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ isPublic: true }, { userId: 2 }],
          },
        })
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.flashcardDeck.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardDeck.count.mockResolvedValue(0);

      await service.findAll(undefined, { search: 'test' });

      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith(
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
      mockPrismaService.flashcardDeck.findMany.mockResolvedValue([]);
      mockPrismaService.flashcardDeck.count.mockResolvedValue(0);

      await service.findAll(undefined, { limit: 10, offset: 5 });

      expect(mockPrismaService.flashcardDeck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return public deck', async () => {
      const mockDeck = { id: 1, name: 'Public', isPublic: true, userId: 1, cards: [] };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      const result = await service.findOne(1);

      expect(result).toEqual(mockDeck);
    });

    it('should return own private deck', async () => {
      const mockDeck = { id: 1, name: 'Private', isPublic: false, userId: 2, cards: [] };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      const result = await service.findOne(1, 2);

      expect(result).toEqual(mockDeck);
    });

    it('should throw NotFoundException when deck not found', async () => {
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing other user private deck', async () => {
      const mockDeck = { id: 1, name: 'Private', isPublic: false, userId: 1 };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      await expect(service.findOne(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create deck with kanji', async () => {
      const mockDeck = {
        id: 1,
        name: 'New Deck',
        userId: 1,
        isPublic: false,
        cards: [
          { kanji: { id: 1, character: '一' }, front: 'Front content', back: 'Back content' },
        ],
      };

      mockPrismaService.kanji.count.mockResolvedValue(1);
      mockPrismaService.flashcardDeck.create.mockResolvedValue(mockDeck);

      const result = await service.create(1, {
        name: 'New Deck',
        kanjiIds: [1],
      });

      expect(result).toEqual(mockDeck);
      expect(mockPrismaService.kanji.count).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
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
    it('should update own deck', async () => {
      const mockDeck = { id: 1, userId: 1, isPublic: false };
      const mockUpdated = { ...mockDeck, name: 'Updated' };

      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeck.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, 1, { name: 'Updated' });

      expect(result).toEqual(mockUpdated);
    });

    it('should throw ForbiddenException when updating other user deck', async () => {
      const mockDeck = { id: 1, userId: 1, isPublic: false };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      await expect(service.update(1, 2, { name: 'Hack' })).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete own deck', async () => {
      const mockDeck = { id: 1, userId: 1 };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeck.delete.mockResolvedValue(mockDeck);

      await service.delete(1, 1);

      expect(mockPrismaService.flashcardDeck.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw ForbiddenException when deleting other user deck', async () => {
      const mockDeck = { id: 1, userId: 1 };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addCard', () => {
    it('should add card to deck', async () => {
      const mockDeck = { id: 1, userId: 1, cards: [] };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValueOnce(mockDeck);
      mockPrismaService.kanji.findUnique.mockResolvedValue({ id: 1, character: '一' });
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(null);
      mockPrismaService.flashcardCard.create.mockResolvedValue({});
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValueOnce({
        ...mockDeck,
        cards: [{ kanji: { id: 1 } }],
      });

      const result = await service.addCard(1, 1, 1);

      expect(mockPrismaService.flashcardCard.create).toHaveBeenCalled();
      expect(result.cards).toHaveLength(1);
    });

    it('should throw BadRequestException when card already in deck', async () => {
      const mockDeck = { id: 1, userId: 1 };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.kanji.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.addCard(1, 1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCard', () => {
    it('should remove card from deck', async () => {
      const mockDeck = { id: 1, userId: 1, cards: [{ kanji: { id: 1 } }] };
      const mockCard = { id: 1, deckId: 1, kanjiId: 1 };

      mockPrismaService.flashcardDeck.findUnique.mockResolvedValueOnce(mockDeck);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(mockCard);
      mockPrismaService.flashcardCard.delete.mockResolvedValue(mockCard);
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValueOnce({
        ...mockDeck,
        cards: [],
      });

      const result = await service.removeCard(1, 1, 1);

      expect(mockPrismaService.flashcardCard.delete).toHaveBeenCalledWith({
        where: { deckId_kanjiId: { deckId: 1, kanjiId: 1 } },
      });
      expect(result.cards).toHaveLength(0);
    });

    it('should throw NotFoundException when card not in deck', async () => {
      const mockDeck = { id: 1, userId: 1 };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardCard.findUnique.mockResolvedValue(null);

      await expect(service.removeCard(1, 1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestPublish', () => {
    it('should create publish request', async () => {
      const mockDeck = { id: 1, userId: 1, isPublic: false, cards: [{ id: 1 }] };
      const mockRequest = { id: 1, deckId: 1, userId: 1, status: 'pending' };

      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeckPublishRequest.findFirst.mockResolvedValue(null);
      mockPrismaService.flashcardDeckPublishRequest.create.mockResolvedValue(mockRequest);

      const result = await service.requestPublish(1, 1);

      expect(result).toEqual(mockRequest);
      expect(mockPrismaService.flashcardDeckPublishRequest.create).toHaveBeenCalledWith({
        data: {
          deckId: 1,
          userId: 1,
          status: 'pending',
        },
      });
    });

    it('should throw BadRequestException when deck is empty', async () => {
      const mockDeck = { id: 1, userId: 1, cards: [] };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);

      await expect(service.requestPublish(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pending request exists', async () => {
      const mockDeck = { id: 1, userId: 1, cards: [{ id: 1 }] };
      mockPrismaService.flashcardDeck.findUnique.mockResolvedValue(mockDeck);
      mockPrismaService.flashcardDeckPublishRequest.findFirst.mockResolvedValue({
        id: 1,
        status: 'pending',
      });

      await expect(service.requestPublish(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approvePublishRequest', () => {
    it('should approve request and make deck public', async () => {
      const mockRequest = { id: 1, deckId: 1, status: 'pending' };

      mockPrismaService.flashcardDeckPublishRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.$transaction.mockImplementation(async (operations) => {
        for (const op of operations) {
          await op;
        }
      });
      mockPrismaService.flashcardDeck.update.mockResolvedValue({ id: 1, isPublic: true });
      mockPrismaService.flashcardDeckPublishRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'approved',
        reviewedBy: 2,
      });

      const result = await service.approvePublishRequest(1, 2);

      expect(result).toEqual({ message: 'Publish request approved', deckId: 1 });
      expect(mockPrismaService.flashcardDeck.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isPublic: true },
      });
    });

    it('should throw BadRequestException when request not pending', async () => {
      const mockRequest = { id: 1, status: 'approved' };
      mockPrismaService.flashcardDeckPublishRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.approvePublishRequest(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('rejectPublishRequest', () => {
    it('should reject request with reason', async () => {
      const mockRequest = { id: 1, status: 'pending' };

      mockPrismaService.flashcardDeckPublishRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.flashcardDeckPublishRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'rejected',
        reviewedBy: 2,
        message: 'Not good enough',
      });

      const result = await service.rejectPublishRequest(1, 2, 'Not good enough');

      expect(result).toEqual({ message: 'Publish request rejected' });
      expect(mockPrismaService.flashcardDeckPublishRequest.update).toHaveBeenCalledWith({
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
