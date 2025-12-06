import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ActivityType } from 'generated/prisma';
import { DbClient } from '../db_client/db_client.service';

@Injectable()
export class UserProfileService {
  constructor(
    private userProfileRepo: UserProfileRepository,
    private prisma: DbClient
  ) {}

  async getProfile(userId: number) {
    let profile = await this.userProfileRepo.findByUserId(userId);
    
    // Create profile if not exists
    if (!profile) {
      profile = await this.userProfileRepo.createProfile(userId);
    }

    return profile;
  }

  async updateProfile(userId: number, updateData: UpdateProfileDto) {
    const profile = await this.userProfileRepo.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // If profile_image_url is provided, update user's profile_image
    if (updateData.profile_image_url) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { profile_image: updateData.profile_image_url }
      });
      // Remove profile_image_url from profile data as it's stored in users table
      const { profile_image_url, ...profileData } = updateData;
      return this.userProfileRepo.updateProfile(userId, profileData);
    }

    return this.userProfileRepo.updateProfile(userId, updateData);
  }

  async getLearningHistory(userId: number, limit?: number, offset?: number) {
    return this.userProfileRepo.getLearningHistory(userId, limit, offset);
  }

  async recordActivity(
    userId: number,
    activityType: ActivityType,
    activityData: any,
    pointsEarned: number = 0
  ) {
    // Add learning history
    await this.userProfileRepo.addLearningActivity(
      userId,
      activityType,
      activityData,
      pointsEarned
    );

    // Update profile stats
    const profile = await this.getProfile(userId);
    const updates: any = {
      total_points: profile.total_points + pointsEarned,
    };

    switch (activityType) {
      case ActivityType.QUIZ_COMPLETED:
        updates.total_quiz = profile.total_quiz + 1;
        break;
      case ActivityType.FLASHCARD_STUDIED:
        updates.total_flashcard = profile.total_flashcard + 1;
        break;
      case ActivityType.KANJI_LEARNED:
        updates.total_kanji = profile.total_kanji + 1;
        break;
    }

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = new Date(profile.last_activity_at);
    lastActivity.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change to streak
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      updates.current_streak = profile.current_streak + 1;
      if (updates.current_streak > profile.longest_streak) {
        updates.longest_streak = updates.current_streak;
      }
    } else {
      // Streak broken, reset to 1
      updates.current_streak = 1;
    }

    await this.userProfileRepo.updateStats(userId, updates);
  }

  async getLeaderboard(limit: number = 10) {
    return this.userProfileRepo.getLeaderboard(limit);
  }

  async updateUserProfileImage(userId: number, imageUrl: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: { profile_image: imageUrl },
    });
  }
}
