import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { KanjiListService } from './kanji-list.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CreateKanjiListDto } from './dto/create-kanji-list.dto';

@Controller('kanji-lists')
export class KanjiListController {
  constructor(private kanjiListService: KanjiListService) {}

  // GET /kanji-lists/jlpt/:level - Get JLPT level lists (N5, N4, N3, N2, N1)
  @Get('jlpt/:level')
  @UseGuards(JwtAuthGuard)
  async findByJlpt(
    @Param('level') level: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    // Validate JLPT level
    const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const normalizedLevel = level.toUpperCase();
    if (!validLevels.includes(normalizedLevel)) {
      throw new BadRequestException(
        `Invalid JLPT level. Must be one of: ${validLevels.join(', ')}`,
      );
    }
    return this.kanjiListService.findByJlpt(normalizedLevel, userId);
  }

  // GET /kanji-lists - Get all lists (public + user's own if authenticated)
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.kanjiListService.findAll(userId, {
      search,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // GET /kanji-lists/my-publish-requests - Get user's own publish requests
  @Get('my-publish-requests')
  @UseGuards(JwtAuthGuard)
  async getMyPublishRequests(@Query('status') status?: string, @Req() req?: any) {
    const userId = req.user.id;
    return this.kanjiListService.getMyPublishRequests(userId, status as any);
  }

  // GET /kanji-lists/:id - Get single list (protected to get userId)
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.kanjiListService.findOne(id, userId);
  }

  // POST /kanji-lists - Create new list (protected)
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateKanjiListDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.kanjiListService.create(userId, body);
  }

  // PUT /kanji-lists/:id - Update list (protected)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      categoryId?: number;
    },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.kanjiListService.update(id, userId, body);
  }

  // PATCH /kanji-lists/:id - Update list (protected) - alias for PUT
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      categoryId?: number;
    },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.kanjiListService.update(id, userId, body);
  }

  // DELETE /kanji-lists/:id - Delete list (protected)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.kanjiListService.delete(id, userId);
  }

  // POST /kanji-lists/:id/kanji/:kanjiId - Add kanji to list (protected)
  @Post(':id/kanji/:kanjiId')
  @UseGuards(JwtAuthGuard)
  async addKanji(
    @Param('id', ParseIntPipe) id: number,
    @Param('kanjiId', ParseIntPipe) kanjiId: number,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.kanjiListService.addKanji(id, userId, kanjiId);
  }

  // DELETE /kanji-lists/:id/kanji/:kanjiId - Remove kanji from list (protected)
  @Delete(':id/kanji/:kanjiId')
  @UseGuards(JwtAuthGuard)
  async removeKanji(
    @Param('id', ParseIntPipe) id: number,
    @Param('kanjiId', ParseIntPipe) kanjiId: number,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.kanjiListService.removeKanji(id, userId, kanjiId);
  }

  // POST /kanji-lists/:id/publish - Request publish (protected)
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async requestPublish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.kanjiListService.requestPublish(id, userId);
  }

  // GET /kanji-lists/admin/publish-requests - Get publish requests (admin only)
  @Get('admin/publish-requests')
  @UseGuards(JwtAuthGuard)
  async getPublishRequests(@Query('status') status?: string, @Req() req?: any) {
    // TODO: Add admin role check
    return this.kanjiListService.getPublishRequests(status as any);
  }

  // POST /kanji-lists/admin/publish-requests/:id/approve - Approve request (admin only)
  @Post('admin/publish-requests/:id/approve')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async approvePublishRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    // TODO: Add admin role check
    const adminId = req.user.id;
    return this.kanjiListService.approvePublishRequest(id, adminId);
  }

  // POST /kanji-lists/admin/publish-requests/:id/reject - Reject request (admin only)
  @Post('admin/publish-requests/:id/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async rejectPublishRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    // TODO: Add admin role check
    const adminId = req.user.id;
    return this.kanjiListService.rejectPublishRequest(id, adminId, body.reason);
  }
}
