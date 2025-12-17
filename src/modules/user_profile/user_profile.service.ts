import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ActivityType } from 'generated/prisma';
import { DbClient } from '../db_client/db_client.service';
import { verifyPassword, hashPassword } from '../../utils/hash.util';

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
    // Only add learning history, no stats tracking
    await this.userProfileRepo.addLearningActivity(
      userId,
      activityType,
      activityData,
      pointsEarned
    );
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

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Validate new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận mật khẩu không khớp');
    }

    // Get user with password
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, hash_password: true }
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.hash_password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await this.prisma.users.update({
      where: { id: userId },
      data: { 
        hash_password: hashedNewPassword,
        update_at: new Date()
      }
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
}
