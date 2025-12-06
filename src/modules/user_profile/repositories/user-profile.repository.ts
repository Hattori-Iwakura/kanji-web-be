import { Injectable } from '@nestjs/common';
import { DbClient } from 'src/modules/db_client/db_client.service';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { ActivityType } from 'generated/prisma';

@Injectable()
export class UserProfileRepository {
  constructor(private prisma: DbClient) {}

  async findByUserId(userId: number) {
    return this.prisma.userProfile.findUnique({
      where: { user_id: userId },
      include: {
        User: {
          select: {
            account: true,
            email: true,
            profile_image: true,
            create_at: true,
          },
        },
      },
    });
  }

  async createProfile(userId: number) {
    return this.prisma.userProfile.create({
      data: {
        user_id: userId,
      },
      include: {
        User: {
          select: {
            account: true,
            email: true,
            profile_image: true,
            create_at: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: number, data: UpdateProfileDto) {
    return this.prisma.userProfile.update({
      where: { user_id: userId },
      data: {
        ...data,
        update_at: new Date(),
      },
      include: {
        User: {
          select: {
            account: true,
            email: true,
            profile_image: true,
            create_at: true,
          },
        },
      },
    });
  }

  async updateStats(userId: number, stats: {
    total_kanji?: number;
    total_quiz?: number;
    total_flashcard?: number;
    total_points?: number;
    current_streak?: number;
    longest_streak?: number;
  }) {
    return this.prisma.userProfile.update({
      where: { user_id: userId },
      data: {
        ...stats,
        last_activity_at: new Date(),
        update_at: new Date(),
      },
    });
  }

  async getLearningHistory(userId: number, limit: number = 50, offset: number = 0) {
    return this.prisma.learningHistory.findMany({
      where: { user_id: userId },
      orderBy: { create_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async addLearningActivity(
    userId: number,
    activityType: ActivityType,
    activityData: any,
    pointsEarned: number = 0
  ) {
    return this.prisma.learningHistory.create({
      data: {
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        points_earned: pointsEarned,
      },
    });
  }

  async getLeaderboard(limit: number = 10) {
    return this.prisma.userProfile.findMany({
      take: limit,
      orderBy: { total_points: 'desc' },
      include: {
        User: {
          select: {
            account: true,
            profile_image: true,
          },
        },
      },
    });
  }
}
