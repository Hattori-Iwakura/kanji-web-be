import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DbClient } from '../db_client/db_client.service';

export interface Activity {
  id: string;
  type: 'user' | 'list' | 'quiz' | 'news';
  description: string;
  timestamp: Date | string;
  user?: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: DbClient) {}

  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get counts in parallel
    const [
      totalUsers,
      totalKanjis,
      totalCollections,
      totalQuizzes,
      usersToday,
      usersYesterday,
      usersThisWeek,
      usersThisMonth,
      collectionsToday,
      activeSessions,
      onlineUsers,
      activeUsersLast24h,
      bannedUsers,
      quizCompletionsToday,
      pendingQuizRequests,
      pendingDeckRequests
    ] = await Promise.all([
      // Total counts
      this.prisma.users.count(),
      this.prisma.kanji.count(),
      this.prisma.kanjiCollections.count(),
      this.prisma.quiz.count(),
      
      // User registrations
      this.prisma.users.count({ where: { create_at: { gte: today } } }),
      this.prisma.users.count({ where: { create_at: { gte: yesterday, lt: today } } }),
      this.prisma.users.count({ where: { create_at: { gte: lastWeek } } }),
      this.prisma.users.count({ where: { create_at: { gte: lastMonth } } }),
      
      // Collections created today  
      this.prisma.kanjiCollections.count({ where: { create_at: { gte: today } } }),
      
      // Active sessions in last 24h
      this.prisma.userSession.count({
        where: { expiresAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      
      // Online users (active in last 5 minutes)
      this.prisma.users.count({
        where: {
          last_active_at: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
      }),
      
      // Active users (active in last 24h)
      this.prisma.users.count({
        where: {
          last_active_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      
      // Banned/suspended users
      this.prisma.users.count({
        where: {
          status: { in: ['BANNED', 'SUSPENDED'] }
        }
      }),
      
      // Quiz completions today
      this.prisma.quizResult.count({
        where: { completed_at: { gte: today } }
      }),

      // Pending Quiz Requests
      this.prisma.publicQuizRequest.count({
        where: { status: 'PENDING' }
      }),

      // Pending Deck Requests
      this.prisma.publicDeckRequest.count({
        where: { status: 'PENDING' }
      })
    ]);

    // Calculate growth rate
    const userGrowthRate = usersYesterday > 0 
      ? ((usersToday - usersYesterday) / usersYesterday) * 100 
      : 0;

    return {
      totalUsers,
      totalKanjis,
      totalLists: totalCollections,
      totalNews: 0,
      totalQuizzes,
      totalFlashcards: 0,
      onlineUsers,
      activeUsers: activeUsersLast24h,
      activeSessions,
      bannedUsers,
      newUsersToday: usersToday,
      newUsersYesterday: usersYesterday,
      newUsersThisWeek: usersThisWeek,
      newUsersThisMonth: usersThisMonth,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      listsCreatedToday: collectionsToday,
      quizCompletionsToday,
      pendingQuizRequests,
      pendingDeckRequests
    };
  }

  async getRecentActivities(limit: number = 10) {
    const activities: Activity[] = [];

    // Get recent users
    const recentUsers = await this.prisma.users.findMany({
      take: 3,
      orderBy: { create_at: 'desc' },
      select: {
        id: true,
        account: true,
        create_at: true
      }
    });

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user',
        description: 'Người dùng mới đăng ký',
        timestamp: user.create_at,
        user: user.account
      });
    });

    // Get recent quiz results
    const recentQuizResults = await this.prisma.quizResult.findMany({
      take: 3,
      orderBy: { completed_at: 'desc' },
      include: {
        User: {
          select: {
            account: true
          }
        },
        Quiz: {
          select: {
            title: true
          }
        }
      }
    });

    recentQuizResults.forEach(result => {
      activities.push({
        id: `quiz-${result.id}`,
        type: 'quiz',
        description: `Hoàn thành quiz "${result.Quiz.title}"`,
        timestamp: result.completed_at,
        user: result.User?.account
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getUserStats() {
    const users = await this.prisma.users.findMany({
      select: {
        id: true,
        account: true,
        email: true,
        role: true,
        status: true,
        is_active: true,
        last_active_at: true,
        create_at: true,
        _count: {
          select: {
            QuizResults: true,
            KanjiCollections: true
          }
        }
      },
      orderBy: { create_at: 'desc' },
      take: 100
    });

    return users;
  }

  async updateUserStatus(userId: number, status: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'SUSPENDED') {
    return this.prisma.users.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        account: true,
        status: true
      }
    });
  }

  async updateUserLastActive(userId: number) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { last_active_at: new Date() },
      select: { id: true, last_active_at: true }
    });
  }

  async getUserGrowth(days: number = 30): Promise<Array<{ date: string; newUsers: number; activeUsers: number }>> {
    const result: Array<{ date: string; newUsers: number; activeUsers: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [newUsers, activeUsers] = await Promise.all([
        this.prisma.users.count({
          where: {
            create_at: { gte: date, lt: nextDate }
          }
        }),
        this.prisma.users.count({
          where: {
            last_active_at: { gte: date, lt: nextDate }
          }
        })
      ]);
      
      result.push({
        date: date.toISOString().split('T')[0],
        newUsers,
        activeUsers
      });
    }
    
    return result;
  }

  async getSystemHealth() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        database: 'connected',
        backend: 'online',
        api: 'healthy',
        version: '1.0.0'
      };
    } catch (error) {
      return {
        database: 'error',
        backend: 'online',
        api: 'degraded',
        version: '1.0.0'
      };
    }
  }

  // ==================== PUBLIC REQUESTS MANAGEMENT ====================

  async getPendingPublicRequests() {
    const [quizRequests, deckRequests] = await Promise.all([
      this.prisma.publicQuizRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          Quiz: {
            include: {
              User: {
                select: {
                  id: true,
                  account: true,
                  email: true
                }
              },
              Questions: true
            }
          },
          User: {
            select: {
              id: true,
              account: true,
              email: true
            }
          }
        },
        orderBy: { create_at: 'desc' }
      }),
      this.prisma.publicDeckRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          Deck: {
            include: {
              User: {
                select: {
                  id: true,
                  account: true,
                  email: true
                }
              },
              Cards: true
            }
          },
          User: {
            select: {
              id: true,
              account: true,
              email: true
            }
          }
        },
        orderBy: { create_at: 'desc' }
      })
    ]);

    return {
      quizRequests,
      deckRequests,
      totalPending: quizRequests.length + deckRequests.length
    };
  }

  async getQuizRequests(status?: string) {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    return this.prisma.publicQuizRequest.findMany({
      where,
      include: {
        Quiz: {
          include: {
            User: {
              select: {
                id: true,
                account: true,
                email: true
              }
            },
            Questions: true
          }
        },
        User: {
          select: {
            id: true,
            account: true,
            email: true
          }
        },
        ReviewedBy: {
          select: {
            id: true,
            account: true,
            email: true
          }
        }
      },
      orderBy: { create_at: 'desc' }
    });
  }

  async getDeckRequests(status?: string) {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    return this.prisma.publicDeckRequest.findMany({
      where,
      include: {
        Deck: {
          include: {
            User: {
              select: {
                id: true,
                account: true,
                email: true
              }
            },
            Cards: true
          }
        },
        User: {
          select: {
            id: true,
            account: true,
            email: true
          }
        },
        ReviewedBy: {
          select: {
            id: true,
            account: true,
            email: true
          }
        }
      },
      orderBy: { create_at: 'desc' }
    });
  }

  async approveQuizRequest(requestId: number, adminId: number, adminNote?: string) {
    // Check if request exists and is pending
    const request = await this.prisma.publicQuizRequest.findUnique({
      where: { id: requestId },
      include: { Quiz: true }
    });

    if (!request) {
      throw new NotFoundException('Quiz request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // Update request and quiz in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.publicQuizRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          admin_note: adminNote,
          reviewed_by: adminId,
          reviewed_at: new Date()
        },
        include: {
          Quiz: true,
          User: {
            select: {
              id: true,
              account: true,
              email: true
            }
          }
        }
      });

      // Make quiz public
      await tx.quiz.update({
        where: { id: request.quiz_id },
        data: { is_public: true }
      });

      return updatedRequest;
    });

    return result;
  }

  async rejectQuizRequest(requestId: number, adminId: number, adminNote: string) {
    if (!adminNote) {
      throw new BadRequestException('Admin note is required for rejection');
    }

    const request = await this.prisma.publicQuizRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Quiz request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    return this.prisma.publicQuizRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        admin_note: adminNote,
        reviewed_by: adminId,
        reviewed_at: new Date()
      },
      include: {
        Quiz: true,
        User: {
          select: {
            id: true,
            account: true,
            email: true
          }
        }
      }
    });
  }

  async approveDeckRequest(requestId: number, adminId: number, adminNote?: string) {
    const request = await this.prisma.publicDeckRequest.findUnique({
      where: { id: requestId },
      include: { Deck: true }
    });

    if (!request) {
      throw new NotFoundException('Deck request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.publicDeckRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          admin_note: adminNote,
          reviewed_by: adminId,
          reviewed_at: new Date()
        },
        include: {
          Deck: true,
          User: {
            select: {
              id: true,
              account: true,
              email: true
            }
          }
        }
      });

      await tx.flashcardDeck.update({
        where: { id: request.deck_id },
        data: { is_public: true }
      });

      return updatedRequest;
    });

    return result;
  }

  async rejectDeckRequest(requestId: number, adminId: number, adminNote: string) {
    if (!adminNote) {
      throw new BadRequestException('Admin note is required for rejection');
    }

    const request = await this.prisma.publicDeckRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Deck request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    return this.prisma.publicDeckRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        admin_note: adminNote,
        reviewed_by: adminId,
        reviewed_at: new Date()
      },
      include: {
        Deck: true,
        User: {
          select: {
            id: true,
            account: true,
            email: true
          }
        }
      }
    });
  }
}
