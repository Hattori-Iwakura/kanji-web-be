import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { PrismaService } from '../../shared/services/prisma.service';

describe('QuizService', () => {
  let service: QuizService;
  let prisma: PrismaService;

  const mockPrismaService = {
    quiz: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return public quizzes when no userId provided', async () => {
      const mockQuizzes = [
        { id: 1, title: 'Public Quiz', isPublic: true, userId: 1, questions: [] },
      ];
      mockPrismaService.quiz.findMany.mockResolvedValue(mockQuizzes);
      mockPrismaService.quiz.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toEqual(mockQuizzes);
      expect(result.total).toBe(1);
      expect(mockPrismaService.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ isPublic: true }] },
        })
      );
    });

    it('should return public + own quizzes when userId provided', async () => {
      const mockQuizzes = [
        { id: 1, title: 'Public Quiz', isPublic: true, userId: 1, questions: [] },
        { id: 2, title: 'My Quiz', isPublic: false, userId: 2, questions: [] },
      ];
      mockPrismaService.quiz.findMany.mockResolvedValue(mockQuizzes);
      mockPrismaService.quiz.count.mockResolvedValue(2);

      const result = await service.findAll(2);

      expect(result.data).toEqual(mockQuizzes);
      expect(mockPrismaService.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ isPublic: true }, { userId: 2 }],
          },
        })
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.quiz.findMany.mockResolvedValue([]);
      mockPrismaService.quiz.count.mockResolvedValue(0);

      await service.findAll(undefined, { search: 'test' });

      expect(mockPrismaService.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaService.quiz.findMany.mockResolvedValue([]);
      mockPrismaService.quiz.count.mockResolvedValue(0);

      await service.findAll(undefined, { limit: 10, offset: 5 });

      expect(mockPrismaService.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return public quiz', async () => {
      const mockQuiz = { id: 1, title: 'Public', isPublic: true, userId: 1, questions: [] };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.findOne(1);

      expect(result).toEqual(mockQuiz);
    });

    it('should return own private quiz', async () => {
      const mockQuiz = { id: 1, title: 'Private', isPublic: false, userId: 2, questions: [] };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      const result = await service.findOne(1, 2);

      expect(result).toEqual(mockQuiz);
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when accessing other user private quiz', async () => {
      const mockQuiz = { id: 1, title: 'Private', isPublic: false, userId: 1 };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      await expect(service.findOne(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create quiz', async () => {
      const mockQuiz = {
        id: 1,
        title: 'New Quiz',
        description: 'Test description',
        userId: 1,
        isPublic: false,
        questions: [],
      };

      mockPrismaService.quiz.create.mockResolvedValue(mockQuiz);

      const result = await service.create(1, {
        title: 'New Quiz',
        description: 'Test description',
      });

      expect(result).toEqual(mockQuiz);
      expect(mockPrismaService.quiz.create).toHaveBeenCalledWith({
        data: {
          title: 'New Quiz',
          description: 'Test description',
          userId: 1,
          isPublic: false,
        },
        include: {
          questions: true,
          user: { select: { id: true, email: true, name: true } },
        },
      });
    });

    it('should create quiz without description', async () => {
      const mockQuiz = {
        id: 1,
        title: 'New Quiz',
        userId: 1,
        isPublic: false,
        questions: [],
      };

      mockPrismaService.quiz.create.mockResolvedValue(mockQuiz);

      const result = await service.create(1, { title: 'New Quiz' });

      expect(result).toEqual(mockQuiz);
    });
  });

  describe('update', () => {
    it('should update own quiz', async () => {
      const mockQuiz = { id: 1, userId: 1, isPublic: false };
      const mockUpdated = { ...mockQuiz, title: 'Updated' };

      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quiz.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, 1, { title: 'Updated' });

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.quiz.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'Updated' },
        include: { questions: true },
      });
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.update(999, 1, { title: 'Updated' })).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when updating other user quiz', async () => {
      const mockQuiz = { id: 1, userId: 1, isPublic: false };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      await expect(service.update(1, 2, { title: 'Hack' })).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('delete', () => {
    it('should delete own quiz', async () => {
      const mockQuiz = { id: 1, userId: 1 };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quiz.delete.mockResolvedValue(mockQuiz);

      await service.delete(1, 1);

      expect(mockPrismaService.quiz.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting other user quiz', async () => {
      const mockQuiz = { id: 1, userId: 1 };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);

      await expect(service.delete(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });
});
