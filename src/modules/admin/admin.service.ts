import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== DASHBOARD OVERVIEW ====================

  async getDashboardOverview() {
    const [
      totalUsers,
      totalKanji,
      totalQuizzes,
      totalLists,
      totalDecks,
      activeUsers,
      pendingPublishRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.kanji.count(),
      this.prisma.quiz.count(),
      this.prisma.kanjiList.count({ where: { userId: { not: null } } }),
      this.prisma.flashcardDeck.count(),
      this.prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      this.prisma.quizPublishRequest.count({
        where: { status: 'pending' },
      }),
    ]);

    const [recentQuizPublish, recentListPublish, recentDeckPublish] = await Promise.all([
      this.prisma.quizPublishRequest.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.kanjiListPublishRequest.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.flashcardDeckPublishRequest.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: await this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      },
      content: {
        kanji: totalKanji,
        quizzes: totalQuizzes,
        lists: totalLists,
        decks: totalDecks,
      },
      activity: {
        activeUsers,
        pendingPublishRequests,
        recentPublishRequests: recentQuizPublish + recentListPublish + recentDeckPublish,
      },
    };
  }

  // ==================== USER STATISTICS ====================

  async getUserStatistics(period: string = 'week') {
    const dateThreshold = this.getDateThreshold(period);

    const [total, newUsers, activeUsers, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: dateThreshold } },
      }),
      this.prisma.user.count({
        where: { updatedAt: { gte: dateThreshold } },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return {
      total,
      newUsers,
      activeUsers,
      byRole: byRole.map(r => ({ role: r.role, count: r._count })),
      growth: await this.calculateGrowth('user', period),
    };
  }

  // ==================== CONTENT STATISTICS ====================

  async getContentStatistics(period: string = 'week') {
    const dateThreshold = this.getDateThreshold(period);

    const [
      totalQuizzes,
      totalLists,
      totalDecks,
      newQuizzes,
      newLists,
      newDecks,
      publicQuizzes,
      publicLists,
      publicDecks,
    ] = await Promise.all([
      this.prisma.quiz.count(),
      this.prisma.kanjiList.count({ where: { userId: { not: null } } }),
      this.prisma.flashcardDeck.count(),
      this.prisma.quiz.count({ where: { createdAt: { gte: dateThreshold } } }),
      this.prisma.kanjiList.count({ where: { createdAt: { gte: dateThreshold }, userId: { not: null } } }),
      this.prisma.flashcardDeck.count({ where: { createdAt: { gte: dateThreshold } } }),
      this.prisma.quiz.count({ where: { isPublic: true } }),
      this.prisma.kanjiList.count({ where: { isPublic: true } }),
      this.prisma.flashcardDeck.count({ where: { isPublic: true } }),
    ]);

    return {
      quizzes: { total: totalQuizzes, new: newQuizzes, public: publicQuizzes },
      lists: { total: totalLists, new: newLists, public: publicLists },
      decks: { total: totalDecks, new: newDecks, public: publicDecks },
    };
  }

  // ==================== ACTIVITY STATISTICS ====================

  async getActivityStatistics(period: string = 'week', limit: number = 20) {
    const dateThreshold = this.getDateThreshold(period);

    const [quizAttempts, flashcardSessions, recentUsers] = await Promise.all([
      this.prisma.quizAttempt.count({
        where: { createdAt: { gte: dateThreshold } },
      }),
      this.prisma.flashcardStudySession.count({
        where: { createdAt: { gte: dateThreshold } },
      }),
      this.prisma.user.findMany({
        where: { updatedAt: { gte: dateThreshold } },
        select: {
          id: true,
          email: true,
          name: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ]);

    return {
      quizAttempts,
      flashcardSessions,
      totalActivities: quizAttempts + flashcardSessions,
      recentUsers,
    };
  }

  // ==================== CHART DATA ====================

  async getUserChartData(period: string = '30d') {
    const days = this.parsePeriodToDays(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Group by date
    const dateMap = new Map<string, number>();
    users.forEach(u => {
      const date = u.createdAt.toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + u._count);
    });

    const dates: string[] = [];
    const values: number[] = [];
    let cumulative = await this.prisma.user.count({
      where: { createdAt: { lt: startDate } },
    });

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = dateMap.get(dateStr) || 0;
      cumulative += count;
      
      dates.push(dateStr);
      values.push(cumulative);
    }

    return { dates, values, newUsers: Array.from(dateMap.values()) };
  }

  async getActivityChartData(period: string = '30d') {
    const days = this.parsePeriodToDays(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [quizAttempts, flashcardSessions] = await Promise.all([
      this.prisma.quizAttempt.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      this.prisma.flashcardStudySession.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    const dates: string[] = [];
    const quizValues: number[] = [];
    const flashcardValues: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const quizCount = quizAttempts.filter(
        q => q.createdAt.toISOString().split('T')[0] === dateStr
      ).reduce((sum, q) => sum + q._count, 0);

      const flashcardCount = flashcardSessions.filter(
        f => f.createdAt.toISOString().split('T')[0] === dateStr
      ).reduce((sum, f) => sum + f._count, 0);

      dates.push(dateStr);
      quizValues.push(quizCount);
      flashcardValues.push(flashcardCount);
    }

    return { dates, quizAttempts: quizValues, flashcardSessions: flashcardValues };
  }

  // ==================== PUBLISH REQUESTS ====================

  async getPublishRequests(filters: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, type, limit = 20, offset = 0 } = filters;

    const where: any = {};
    if (status) where.status = status;

    let requests: any[] = [];

    // Get requests based on type
    if (!type || type === 'quiz') {
      const quizRequests = await this.prisma.quizPublishRequest.findMany({
        where,
        include: {
          quiz: { select: { title: true, difficulty: true } },
          user: { select: { email: true, name: true } },
          reviewer: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      requests.push(...quizRequests.map(r => ({ ...r, type: 'quiz' })));
    }

    if (!type || type === 'list') {
      const listRequests = await this.prisma.kanjiListPublishRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      requests.push(...listRequests.map(r => ({ ...r, type: 'list' })));
    }

    if (!type || type === 'deck') {
      const deckRequests = await this.prisma.flashcardDeckPublishRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });
      requests.push(...deckRequests.map(r => ({ ...r, type: 'deck' })));
    }

    // Sort by date
    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      requests: requests.slice(0, limit),
      total: requests.length,
    };
  }

  async getPublishRequestById(id: number, type: string) {
    let request: any;

    switch (type) {
      case 'quiz':
        request = await this.prisma.quizPublishRequest.findUnique({
          where: { id },
          include: {
            quiz: {
              include: {
                questions: true,
              },
            },
            user: { select: { id: true, email: true, name: true } },
            reviewer: { select: { id: true, email: true, name: true } },
          },
        });
        break;
      case 'list':
        request = await this.prisma.kanjiListPublishRequest.findUnique({
          where: { id },
        });
        break;
      case 'deck':
        request = await this.prisma.flashcardDeckPublishRequest.findUnique({
          where: { id },
        });
        break;
      default:
        throw new BadRequestException('Invalid type');
    }

    if (!request) {
      throw new NotFoundException('Publish request not found');
    }

    return { ...request, type };
  }

  async reviewPublishRequest(
    id: number,
    type: string,
    adminId: number,
    status: 'approved' | 'rejected',
    reviewMessage?: string,
  ) {
    const now = new Date();
    const updateData = {
      status,
      reviewedBy: adminId,
      reviewedAt: now,
    };

    let result: any;

    switch (type) {
      case 'quiz':
        result = await this.prisma.quizPublishRequest.update({
          where: { id },
          data: updateData,
          include: { quiz: true },
        });

        // Update quiz visibility if approved
        if (status === 'approved') {
          await this.prisma.quiz.update({
            where: { id: result.quizId },
            data: { isPublic: true },
          });
        }
        break;

      case 'list':
        result = await this.prisma.kanjiListPublishRequest.update({
          where: { id },
          data: updateData,
        });

        if (status === 'approved') {
          await this.prisma.kanjiList.update({
            where: { id: result.listId },
            data: { isPublic: true },
          });
        }
        break;

      case 'deck':
        result = await this.prisma.flashcardDeckPublishRequest.update({
          where: { id },
          data: updateData,
        });

        if (status === 'approved') {
          await this.prisma.flashcardDeck.update({
            where: { id: result.deckId },
            data: { isPublic: true },
          });
        }
        break;

      default:
        throw new BadRequestException('Invalid type');
    }

    return result;
  }

  async getPublishStatistics() {
    const [
      totalQuiz,
      totalList,
      totalDeck,
      pendingQuiz,
      pendingList,
      pendingDeck,
      approvedQuiz,
      approvedList,
      approvedDeck,
    ] = await Promise.all([
      this.prisma.quizPublishRequest.count(),
      this.prisma.kanjiListPublishRequest.count(),
      this.prisma.flashcardDeckPublishRequest.count(),
      this.prisma.quizPublishRequest.count({ where: { status: 'pending' } }),
      this.prisma.kanjiListPublishRequest.count({ where: { status: 'pending' } }),
      this.prisma.flashcardDeckPublishRequest.count({ where: { status: 'pending' } }),
      this.prisma.quizPublishRequest.count({ where: { status: 'approved' } }),
      this.prisma.kanjiListPublishRequest.count({ where: { status: 'approved' } }),
      this.prisma.flashcardDeckPublishRequest.count({ where: { status: 'approved' } }),
    ]);

    return {
      total: totalQuiz + totalList + totalDeck,
      pending: pendingQuiz + pendingList + pendingDeck,
      approved: approvedQuiz + approvedList + approvedDeck,
      byType: {
        quiz: { total: totalQuiz, pending: pendingQuiz, approved: approvedQuiz },
        list: { total: totalList, pending: pendingList, approved: approvedList },
        deck: { total: totalDeck, pending: pendingDeck, approved: approvedDeck },
      },
    };
  }

  // ==================== SYSTEM HEALTH ====================

  async getSystemHealth() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      const [userCount, kanjiCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.kanji.count(),
      ]);

      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date(),
        checks: {
          database: 'ok',
          users: userCount > 0 ? 'ok' : 'warning',
          kanji: kanjiCount > 0 ? 'ok' : 'warning',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  async getSystemMetrics(period: string = '24h') {
    // Simple metrics - can be enhanced with proper monitoring tools
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : 168;
    const dateThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [requests, avgResponseTime] = await Promise.all([
      this.prisma.quizAttempt.count({
        where: { createdAt: { gte: dateThreshold } },
      }),
      // Placeholder for actual metrics
      Promise.resolve(Math.random() * 200),
    ]);

    return {
      period,
      requests,
      avgResponseTime: Math.round(avgResponseTime),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  // ==================== HELPER METHODS ====================

  private getDateThreshold(period: string): Date {
    const now = Date.now();
    switch (period) {
      case 'day':
        return new Date(now - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private parsePeriodToDays(period: string): number {
    const match = period.match(/(\d+)([dmy])/);
    if (!match) return 30;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value;
      case 'm':
        return value * 30;
      case 'y':
        return value * 365;
      default:
        return 30;
    }
  }

  private async calculateGrowth(model: string, period: string): Promise<number> {
    const dateThreshold = this.getDateThreshold(period);
    const previousThreshold = new Date(
      dateThreshold.getTime() - (Date.now() - dateThreshold.getTime())
    );

    const [current, previous] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: dateThreshold } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: previousThreshold,
            lt: dateThreshold,
          },
        },
      }),
    ]);

    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
