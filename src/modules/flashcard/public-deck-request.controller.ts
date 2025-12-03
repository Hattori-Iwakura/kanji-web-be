import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PublicDeckRequestService } from './public-deck-request.service';
import {
  CreatePublicDeckRequestDto,
  ReviewPublicDeckRequestDto,
  PublicDeckRequestQueryDto,
} from './dtos/public-deck-request.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../../../generated/prisma';

@ApiTags('Public Deck Requests')
@Controller('flashcard/public-requests')
@UseGuards(JwtGuard)
export class PublicDeckRequestController {
  constructor(private readonly publicDeckRequestService: PublicDeckRequestService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo yêu cầu public deck' })
  @ApiResponse({ status: 201, description: 'Yêu cầu đã được tạo' })
  async createRequest(@Body() dto: CreatePublicDeckRequestDto, @Req() req: any) {
    const userId = req.user?.id;
    return await this.publicDeckRequestService.createRequest(dto, userId);
  }

  @Get('my-requests')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu của tôi' })
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu' })
  async getMyRequests(@Req() req: any) {
    const userId = req.user?.id;
    return await this.publicDeckRequestService.getMyRequests(userId);
  }

  @Get('check/:deckId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Kiểm tra trạng thái yêu cầu của deck' })
  @ApiResponse({ status: 200, description: 'Thông tin yêu cầu' })
  async checkDeckRequest(@Param('deckId', ParseIntPipe) deckId: number, @Req() req: any) {
    const userId = req.user?.id;
    const request = await this.publicDeckRequestService.checkDeckRequest(deckId, userId);
    return { data: request };
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hủy yêu cầu public' })
  @ApiResponse({ status: 200, description: 'Yêu cầu đã được hủy' })
  async cancelRequest(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id;
    return await this.publicDeckRequestService.cancelRequest(id, userId);
  }

  // Admin endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Lấy tất cả yêu cầu public deck' })
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu' })
  async getAllRequests(@Query() query: PublicDeckRequestQueryDto) {
    return await this.publicDeckRequestService.getAllRequests(query);
  }

  @Put(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Xét duyệt yêu cầu public deck' })
  @ApiResponse({ status: 200, description: 'Yêu cầu đã được xét duyệt' })
  async reviewRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewPublicDeckRequestDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return await this.publicDeckRequestService.reviewRequest(id, dto, adminId);
  }
}
