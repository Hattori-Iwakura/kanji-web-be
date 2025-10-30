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
import { FlashcardDeckService } from './flashcard-deck.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('flashcard-decks')
export class FlashcardDeckController {
  constructor(private readonly flashcardDeckService: FlashcardDeckService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('search') search?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.flashcardDeckService.findAll(userId, { search, limit, offset });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.flashcardDeckService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: any,
    @Body() body: { name: string; description?: string; kanjiIds?: number[] },
  ) {
    return this.flashcardDeckService.create(req.user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { name?: string; description?: string; isPublic?: boolean },
  ) {
    return this.flashcardDeckService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.flashcardDeckService.delete(id, req.user.id);
  }

  @Post(':id/cards/:kanjiId')
  @UseGuards(JwtAuthGuard)
  addCard(
    @Param('id', ParseIntPipe) id: number,
    @Param('kanjiId', ParseIntPipe) kanjiId: number,
    @Req() req: any,
  ) {
    return this.flashcardDeckService.addCard(id, req.user.id, kanjiId);
  }

  @Delete(':id/cards/:kanjiId')
  @UseGuards(JwtAuthGuard)
  removeCard(
    @Param('id', ParseIntPipe) id: number,
    @Param('kanjiId', ParseIntPipe) kanjiId: number,
    @Req() req: any,
  ) {
    return this.flashcardDeckService.removeCard(id, req.user.id, kanjiId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  requestPublish(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.flashcardDeckService.requestPublish(id, req.user.id);
  }

  @Get('admin/publish-requests')
  @UseGuards(JwtAuthGuard)
  // TODO: Add admin role guard
  getPublishRequests(@Query('status') status?: string) {
    return this.flashcardDeckService.getPublishRequests(status as any);
  }

  @Post('admin/publish-requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  // TODO: Add admin role guard
  approvePublishRequest(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.flashcardDeckService.approvePublishRequest(id, req.user.id);
  }

  @Post('admin/publish-requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  // TODO: Add admin role guard
  rejectPublishRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { reason?: string },
  ) {
    return this.flashcardDeckService.rejectPublishRequest(id, req.user.id, body.reason);
  }
}
