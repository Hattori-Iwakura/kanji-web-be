import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { ProgressService } from './progress.service';
import {
  ProgressOverviewDto,
  FlashcardProgressQueryDto,
  FlashcardProgressDto,
  QuizProgressQueryDto,
  QuizProgressDto,
  StreakDto,
  LeaderboardQueryDto,
  LeaderboardDto,
  AchievementsDto,
  ChartDataQueryDto,
  ChartDataDto,
  StudyTimeQueryDto,
  StudyTimeDto,
} from './dto/progress.dto';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive progress overview' })
  @ApiResponse({
    status: 200,
    description: 'Progress overview retrieved successfully',
    type: ProgressOverviewDto,
  })
  async getProgressOverview(@Req() req: any): Promise<ProgressOverviewDto> {
    return this.progressService.getProgressOverview(req.user.id);
  }

  @Get('flashcard')
  @ApiOperation({ summary: 'Get detailed flashcard progress' })
  @ApiResponse({
    status: 200,
    description: 'Flashcard progress retrieved successfully',
    type: FlashcardProgressDto,
  })
  async getFlashcardProgress(
    @Req() req: any,
    @Query() query: FlashcardProgressQueryDto,
  ): Promise<FlashcardProgressDto> {
    return this.progressService.getFlashcardProgress(req.user.id, query);
  }

  @Get('quiz')
  @ApiOperation({ summary: 'Get detailed quiz progress' })
  @ApiResponse({
    status: 200,
    description: 'Quiz progress retrieved successfully',
    type: QuizProgressDto,
  })
  async getQuizProgress(
    @Req() req: any,
    @Query() query: QuizProgressQueryDto,
  ): Promise<QuizProgressDto> {
    return this.progressService.getQuizProgress(req.user.id, query);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get streak information' })
  @ApiResponse({
    status: 200,
    description: 'Streak information retrieved successfully',
    type: StreakDto,
  })
  async getStreaks(@Req() req: any): Promise<StreakDto> {
    return this.progressService.getStreaks(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard rankings' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: LeaderboardDto,
  })
  async getLeaderboard(
    @Req() req: any,
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardDto> {
    return this.progressService.getLeaderboard(req.user.id, query);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get achievements' })
  @ApiResponse({
    status: 200,
    description: 'Achievements retrieved successfully',
    type: AchievementsDto,
  })
  async getAchievements(@Req() req: any): Promise<AchievementsDto> {
    return this.progressService.getAchievements(req.user.id);
  }

  @Get('chart-data')
  @ApiOperation({ summary: 'Get chart data for progress visualization' })
  @ApiResponse({
    status: 200,
    description: 'Chart data retrieved successfully',
    type: ChartDataDto,
  })
  async getChartData(
    @Req() req: any,
    @Query() query: ChartDataQueryDto,
  ): Promise<ChartDataDto> {
    return this.progressService.getChartData(req.user.id, query);
  }

  @Get('study-time')
  @ApiOperation({ summary: 'Get study time tracking' })
  @ApiResponse({
    status: 200,
    description: 'Study time retrieved successfully',
    type: StudyTimeDto,
  })
  async getStudyTime(
    @Req() req: any,
    @Query() query: StudyTimeQueryDto,
  ): Promise<StudyTimeDto> {
    return this.progressService.getStudyTime(req.user.id, query);
  }
}
