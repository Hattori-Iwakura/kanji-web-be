import { Controller, Get, Put, Post, Body, UseGuards, Req, Query, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserProfileService } from './user_profile.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';

@Controller('user-profile')
export class UserProfileController {
  constructor(private userProfileService: UserProfileService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.userProfileService.getProfile(userId);
  }

  @Put()
  @UseGuards(JwtGuard)
  async updateProfile(@Req() req: any, @Body() updateData: UpdateProfileDto) {
    const userId = req.user.id;
    return this.userProfileService.updateProfile(userId, updateData);
  }

  @Get('history')
  @UseGuards(JwtGuard)
  async getLearningHistory(
    @Req() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const userId = req.user.id;
    return this.userProfileService.getLearningHistory(userId, limit, offset);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.userProfileService.getLeaderboard(limit);
  }

  @Post('upload-avatar')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.id;
    // Get full URL with protocol and host
    const protocol = req.protocol;
    const host = req.get('host');
    const avatarUrl = `${protocol}://${host}/uploads/avatars/${file.filename}`;

    // Update user's profile_image
    await this.userProfileService.updateUserProfileImage(userId, avatarUrl);

    return { avatarUrl };
  }

  @Post('change-password')
  @UseGuards(JwtGuard)
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.id;
    return this.userProfileService.changePassword(userId, changePasswordDto);
  }
}
