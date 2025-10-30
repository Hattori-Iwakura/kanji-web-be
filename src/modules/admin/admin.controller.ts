import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import {
  PeriodQueryDto,
  ChartQueryDto,
  ActivityQueryDto,
  PublishRequestQueryDto,
  ReviewPublishRequestDto,
  ActivityLogsQueryDto,
  SystemMetricsQueryDto,
} from './dto/admin.dto';

@ApiTags('Admin Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get dashboard overview with aggregated statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('dashboard/stats/users')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStatistics(@Query() query: PeriodQueryDto) {
    return this.adminService.getUserStatistics(query.period);
  }

  @Get('dashboard/stats/content')
  @ApiOperation({ summary: 'Get content statistics' })
  @ApiResponse({ status: 200, description: 'Content statistics retrieved successfully' })
  async getContentStatistics(@Query() query: PeriodQueryDto) {
    return this.adminService.getContentStatistics(query.period);
  }

  @Get('dashboard/stats/activity')
  @ApiOperation({ summary: 'Get activity statistics' })
  @ApiResponse({ status: 200, description: 'Activity statistics retrieved successfully' })
  async getActivityStatistics(@Query() query: ActivityQueryDto) {
    return this.adminService.getActivityStatistics(query.period, query.limit);
  }

  @Get('dashboard/charts/users')
  @ApiOperation({ summary: 'Get user growth chart data' })
  @ApiResponse({ status: 200, description: 'User chart data retrieved successfully' })
  async getUserChartData(@Query() query: ChartQueryDto) {
    return this.adminService.getUserChartData(query.period);
  }

  @Get('dashboard/charts/activity')
  @ApiOperation({ summary: 'Get activity trends chart data' })
  @ApiResponse({ status: 200, description: 'Activity chart data retrieved successfully' })
  async getActivityChartData(@Query() query: ChartQueryDto) {
    return this.adminService.getActivityChartData(query.period);
  }

  // ==================== PUBLISH MANAGEMENT ====================

  @Get('publish/requests')
  @ApiOperation({ summary: 'Get all publish requests with filters' })
  @ApiResponse({ status: 200, description: 'Publish requests retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'type', required: false, enum: ['quiz', 'list', 'deck'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getPublishRequests(@Query() query: PublishRequestQueryDto) {
    return this.adminService.getPublishRequests(query);
  }

  @Get('publish/requests/:id')
  @ApiOperation({ summary: 'Get detailed publish request' })
  @ApiResponse({ status: 200, description: 'Publish request details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Publish request not found' })
  @ApiQuery({ name: 'type', required: true, enum: ['quiz', 'list', 'deck'] })
  async getPublishRequestById(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: string,
  ) {
    return this.adminService.getPublishRequestById(id, type);
  }

  @Patch('publish/requests/:id/review')
  @ApiOperation({ summary: 'Review publish request (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Publish request reviewed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Publish request not found' })
  @ApiQuery({ name: 'type', required: true, enum: ['quiz', 'list', 'deck'] })
  async reviewPublishRequest(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: string,
    @Body() dto: ReviewPublishRequestDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return this.adminService.reviewPublishRequest(
      id,
      type,
      adminId,
      dto.status,
      dto.reviewMessage,
    );
  }

  @Get('publish/statistics')
  @ApiOperation({ summary: 'Get publish request statistics' })
  @ApiResponse({ status: 200, description: 'Publish statistics retrieved successfully' })
  async getPublishStatistics() {
    return this.adminService.getPublishStatistics();
  }

  // ==================== SYSTEM HEALTH ====================

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health check' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('system/metrics')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics(@Query() query: SystemMetricsQueryDto) {
    return this.adminService.getSystemMetrics(query.period);
  }
}
