import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PublicQuizRequestService } from './public-quiz-request.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { ErrorCode } from 'src/shared/error';
import { PublicQuizRequestStatus } from 'generated/prisma';

@ApiTags('Public Quiz Requests')
@Controller('quiz/public-requests')
export class PublicQuizRequestController {
  constructor(private readonly service: PublicQuizRequestService) {}

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a request to make quiz public' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  async createRequest(
    @Body() body: { quiz_id: number; reason: string },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException({
          code: ErrorCode.Unauthorized,
          message: 'User not authenticated',
        });
      }

      if (!body.reason || body.reason.trim().length < 20) {
        throw new BadRequestException({
          code: ErrorCode.BadRequest,
          message: 'Reason must be at least 20 characters',
        });
      }

      return await this.service.createRequest(body.quiz_id, userId, body.reason);
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Get('quiz/:quizId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get public request for a quiz' })
  @ApiResponse({ status: 200, description: 'Request details' })
  async getRequestForQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return await this.service.getRequestForQuiz(quizId, userId);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancel a pending request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return await this.service.cancelRequest(id, userId);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: Get all public requests' })
  @ApiResponse({ status: 200, description: 'List of requests' })
  async getAllRequests(@Query('status') status?: PublicQuizRequestStatus) {
    return await this.service.getAllRequests(status);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/approve')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: Approve a request' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { admin_note?: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return await this.service.approveRequest(id, adminId, body.admin_note);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/reject')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Admin: Reject a request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { admin_note: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id;

    if (!body.admin_note) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Admin note is required when rejecting',
      });
    }

    return await this.service.rejectRequest(id, adminId, body.admin_note);
  }
}
