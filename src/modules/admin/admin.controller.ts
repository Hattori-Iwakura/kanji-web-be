import { Controller, Get, Patch, Post, Param, Body, UseGuards, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return {
      statusCode: 200,
      data: stats,
      timestamp: new Date().toISOString()
    };
  }

  @Get('dashboard/activities')
  @ApiOperation({ summary: 'Get recent activities' })
  async getRecentActivities() {
    const activities = await this.adminService.getRecentActivities();
    return {
      statusCode: 200,
      data: activities,
      timestamp: new Date().toISOString()
    };
  }

  @Get('dashboard/user-growth')
  @ApiOperation({ summary: 'Get user growth data' })
  async getUserGrowth(@Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 30;
    const growth = await this.adminService.getUserGrowth(daysCount);
    return {
      statusCode: 200,
      data: growth,
      timestamp: new Date().toISOString()
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with stats' })
  async getUserStats() {
    const users = await this.adminService.getUserStats();
    return {
      statusCode: 200,
      data: users,
      timestamp: new Date().toISOString()
    };
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health status' })
  async getSystemHealth() {
    const health = await this.adminService.getSystemHealth();
    return {
      statusCode: 200,
      data: health,
      timestamp: new Date().toISOString()
    };
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'BANNED', 'SUSPENDED']
        }
      }
    }
  })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'SUSPENDED'
  ) {
    const user = await this.adminService.updateUserStatus(id, status);
    return {
      statusCode: 200,
      data: user,
      message: 'User status updated successfully',
      timestamp: new Date().toISOString()
    };
  }

  // ==================== PUBLIC REQUESTS MANAGEMENT ====================

  @Get('public-requests/pending')
  @ApiOperation({ summary: 'Get all pending public requests (quiz and deck)' })
  async getPendingPublicRequests() {
    const requests = await this.adminService.getPendingPublicRequests();
    return {
      statusCode: 200,
      data: requests,
      timestamp: new Date().toISOString()
    };
  }

  @Get('public-requests/quiz')
  @ApiOperation({ summary: 'Get all quiz public requests' })
  async getQuizRequests(@Query('status') status?: string) {
    const requests = await this.adminService.getQuizRequests(status);
    return {
      statusCode: 200,
      data: requests,
      timestamp: new Date().toISOString()
    };
  }

  @Get('public-requests/deck')
  @ApiOperation({ summary: 'Get all deck public requests' })
  async getDeckRequests(@Query('status') status?: string) {
    const requests = await this.adminService.getDeckRequests(status);
    return {
      statusCode: 200,
      data: requests,
      timestamp: new Date().toISOString()
    };
  }

  @Post('public-requests/quiz/:id/approve')
  @ApiOperation({ summary: 'Approve a quiz public request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        adminNote: {
          type: 'string',
          description: 'Optional note from admin'
        }
      }
    }
  })
  async approveQuizRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminNote') adminNote: string,
    @Req() req: any
  ) {
    const adminId = req.user.userId;
    const result = await this.adminService.approveQuizRequest(id, adminId, adminNote);
    return {
      statusCode: 200,
      data: result,
      message: 'Quiz request approved successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Post('public-requests/quiz/:id/reject')
  @ApiOperation({ summary: 'Reject a quiz public request' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['adminNote'],
      properties: {
        adminNote: {
          type: 'string',
          description: 'Reason for rejection'
        }
      }
    }
  })
  async rejectQuizRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminNote') adminNote: string,
    @Req() req: any
  ) {
    const adminId = req.user.userId;
    const result = await this.adminService.rejectQuizRequest(id, adminId, adminNote);
    return {
      statusCode: 200,
      data: result,
      message: 'Quiz request rejected',
      timestamp: new Date().toISOString()
    };
  }

  @Post('public-requests/deck/:id/approve')
  @ApiOperation({ summary: 'Approve a deck public request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        adminNote: {
          type: 'string',
          description: 'Optional note from admin'
        }
      }
    }
  })
  async approveDeckRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminNote') adminNote: string,
    @Req() req: any
  ) {
    const adminId = req.user.userId;
    const result = await this.adminService.approveDeckRequest(id, adminId, adminNote);
    return {
      statusCode: 200,
      data: result,
      message: 'Deck request approved successfully',
      timestamp: new Date().toISOString()
    };
  }

  @Post('public-requests/deck/:id/reject')
  @ApiOperation({ summary: 'Reject a deck public request' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['adminNote'],
      properties: {
        adminNote: {
          type: 'string',
          description: 'Reason for rejection'
        }
      }
    }
  })
  async rejectDeckRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body('adminNote') adminNote: string,
    @Req() req: any
  ) {
    const adminId = req.user.userId;
    const result = await this.adminService.rejectDeckRequest(id, adminId, adminNote);
    return {
      statusCode: 200,
      data: result,
      message: 'Deck request rejected',
      timestamp: new Date().toISOString()
    };
  }
}
