import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  NotFoundException,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { Kanji } from 'generated/prisma';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ErrorCode } from 'src/shared/error';
import { CreateKanjiDto, UpdateKanjiDto } from './dtos';
import { SearchKanjiDto } from './dto/search-kanji.dto';
import {
  CreateKanjiListDto,
  AddToListDto,
  UpdateListItemDto,
  ReorderListDto,
} from './dto/kanji-list.dto';
import {
  UpdateProgressDto,
  RecordReviewDto,
} from './dto/kanji-progress.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';

@ApiTags('Kanji')
@Controller('kanji')
export class KanjiController {
  constructor(private readonly kanjiService: KanjiService) {}

  // ==================== Search & Filter ====================
  @Get('search')
  @ApiOperation({ summary: 'Search and filter kanji' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchKanji(@Query() dto: SearchKanjiDto) {
    return this.kanjiService.searchKanji(dto);
  }

  // ==================== Examples ====================
  @Get('character/:character/examples')
  @ApiOperation({ summary: 'Get example words for a kanji' })
  @ApiResponse({ status: 200, description: 'Examples retrieved successfully' })
  async getExamples(
    @Param('character') character: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.kanjiService.getKanjiExamples(character, limit);
  }

  // ==================== Kanji Detail (with progress if authenticated) ====================
  @Get('character/:character')
  @ApiOperation({ summary: 'Get detailed kanji information including examples' })
  @ApiResponse({ status: 200, description: 'Kanji details retrieved successfully' })
  async getKanjiDetail(@Param('character') character: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.kanjiService.getKanjiDetail(character, userId);
  }

  // ==================== Kanji Lists Management ====================
  @Post('lists')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new kanji list' })
  @ApiResponse({ status: 201, description: 'List created successfully' })
  async createList(@Req() req: any, @Body() dto: CreateKanjiListDto) {
    const userId = req.user?.id || 1;
    return this.kanjiService.createList(userId, dto);
  }

  @Get('lists')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all lists for current user' })
  @ApiResponse({ status: 200, description: 'Lists retrieved successfully' })
  async getUserLists(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.kanjiService.getUserLists(userId);
  }

  @Get('lists/:listId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list details with all kanji' })
  @ApiResponse({ status: 200, description: 'List details retrieved successfully' })
  async getListDetail(
    @Req() req: any,
    @Param('listId', ParseIntPipe) listId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.kanjiService.getListDetail(listId, userId);
  }

  @Post('lists/add')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add kanji to a list' })
  @ApiResponse({ status: 200, description: 'Kanji added to list successfully' })
  async addToList(@Req() req: any, @Body() dto: AddToListDto) {
    const userId = req.user?.id || 1;
    return this.kanjiService.addKanjiToList(userId, dto);
  }

  @Delete('lists/:listId/kanji/:kanjiId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove kanji from a list' })
  @ApiResponse({ status: 200, description: 'Kanji removed from list successfully' })
  async removeFromList(
    @Req() req: any,
    @Param('listId', ParseIntPipe) listId: number,
    @Param('kanjiId', ParseIntPipe) kanjiId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.kanjiService.removeFromList(listId, kanjiId, userId);
  }

  @Delete('lists/:listId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a kanji list' })
  @ApiResponse({ status: 200, description: 'List deleted successfully' })
  async deleteList(@Req() req: any, @Param('listId', ParseIntPipe) listId: number) {
    const userId = req.user?.id || 1;
    return this.kanjiService.deleteList(userId, listId);
  }

  @Patch('lists/:listId/reorder')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder kanji in a list' })
  @ApiResponse({ status: 200, description: 'List reordered successfully' })
  async reorderList(
    @Req() req: any,
    @Param('listId', ParseIntPipe) listId: number,
    @Body() dto: ReorderListDto,
  ) {
    const userId = req.user?.id || 1;
    return this.kanjiService.reorderList(userId, listId, dto);
  }

  // ==================== Progress Tracking ====================
  @Get('progress')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress summary' })
  @ApiResponse({ status: 200, description: 'Progress summary retrieved successfully' })
  async getProgress(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.kanjiService.getUserProgress(userId);
  }

  @Get('progress/:character')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get progress for specific kanji' })
  @ApiResponse({ status: 200, description: 'Kanji progress retrieved successfully' })
  async getKanjiProgress(@Req() req: any, @Param('character') character: string) {
    const userId = req.user?.id || 1;
    return this.kanjiService.getKanjiProgress(userId, character);
  }

  @Patch('progress')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update progress for a kanji' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateProgress(@Req() req: any, @Body() dto: UpdateProgressDto) {
    const userId = req.user?.id || 1;
    return this.kanjiService.updateProgress(userId, dto);
  }

  @Post('progress/review')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a review attempt for a kanji' })
  @ApiResponse({ status: 200, description: 'Review recorded successfully' })
  async recordReview(@Req() req: any, @Body() dto: RecordReviewDto) {
    const userId = req.user?.id || 1;
    return this.kanjiService.recordReview(userId, dto);
  }

  // ==================== Basic CRUD (Admin/Seeding) ====================
  @Get()
  @ApiOperation({ summary: 'Get all kanji' })
  @ApiResponse({ status: 200, description: 'Kanji list retrieved successfully' })
  async getAll(): Promise<Kanji[]> {
    const result = await this.kanjiService.getAll();
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get kanji by ID' })
  @ApiResponse({ status: 200, description: 'Kanji retrieved successfully' })
  async getKanji(@Param('id', ParseIntPipe) id: number): Promise<Kanji | null> {
    const kanji = await this.kanjiService.findById(id);
    if (!kanji) {
      throw new BadRequestException(ErrorCode.NotFound);
    }
    return kanji;
  }

  @Put('update/:id')
  @ApiOperation({ summary: 'Update kanji by ID' })
  @ApiResponse({ status: 200, description: 'Kanji updated successfully' })
  async updateKanji(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateKanjiDto,
  ): Promise<Kanji | null> {
    const kanji = await this.kanjiService.updateAsync(id, data);
    if (!kanji) {
      throw new BadRequestException(ErrorCode.NotFound);
    }
    return kanji;
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new kanji' })
  @ApiResponse({ status: 201, description: 'Kanji created successfully' })
  async createKanji(@Body() data: CreateKanjiDto): Promise<Kanji> {
    const existingKanji = await this.kanjiService.findByCharacter(data.character);
    if (existingKanji) {
      throw new BadRequestException(ErrorCode.AlreadyExists);
    }
    const kanji = await this.kanjiService.createAsync(data);
    return kanji;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete kanji by ID' })
  @ApiResponse({ status: 200, description: 'Kanji deleted successfully' })
  async deleteKanji(@Param('id', ParseIntPipe) id: number): Promise<Kanji> {
    const kanji = await this.kanjiService.deleteAsync(id);
    if (!kanji) {
      throw new NotFoundException(ErrorCode.NotFound);
    }
    return kanji;
  }
}

