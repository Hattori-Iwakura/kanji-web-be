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
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FlashcardService } from './flashcard.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddCardDto } from './dto/add-card.dto';
import { ReviewCardDto } from './dto/review-card.dto';
import { StartStudyDto } from './dto/start-study.dto';
import { ReorderCardsDto } from './dto/reorder-cards.dto';
import { BulkAddCardsDto } from './dto/bulk-add-cards.dto';

@ApiTags('Flashcard')
@Controller('flashcard')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // ==================== Deck Endpoints ====================

  @Post('decks')
  @ApiOperation({ summary: 'Create a new flashcard deck' })
  @ApiResponse({ status: 201, description: 'Deck created successfully' })
  createDeck(@Req() req: any, @Body() createDeckDto: CreateDeckDto) {
    const userId = req.user?.id || 1;
    return this.flashcardService.createDeck(userId, createDeckDto);
  }

  @Get('decks')
  @ApiOperation({ summary: 'Get all decks for current user' })
  @ApiResponse({ status: 200, description: 'Decks retrieved successfully' })
  getUserDecks(@Req() req: any) {
    // Temporary: use hardcoded user ID if req.user is undefined
    const userId = req.user?.id || 1;
    return this.flashcardService.getUserDecks(userId);
  }

  @Get('decks/:id')
  @ApiOperation({ summary: 'Get deck by ID' })
  @ApiResponse({ status: 200, description: 'Deck retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  getDeckById(
    @Req() req: any,
    @Param('id', ParseIntPipe) deckId: number,
  ) {
    // Temporary: use hardcoded user ID if req.user is undefined
    const userId = req.user?.id || 1;
    return this.flashcardService.getDeckById(deckId, userId);
  }

  @Put('decks/:id')
  @ApiOperation({ summary: 'Update deck' })
  @ApiResponse({ status: 200, description: 'Deck updated successfully' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  updateDeck(
    @Req() req: any,
    @Param('id', ParseIntPipe) deckId: number,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.updateDeck(deckId, userId, updateDeckDto);
  }

  @Delete('decks/:id')
  @ApiOperation({ summary: 'Delete deck' })
  @ApiResponse({ status: 200, description: 'Deck deleted successfully' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  deleteDeck(
    @Req() req: any,
    @Param('id', ParseIntPipe) deckId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.deleteDeck(deckId, userId);
  }

  // ==================== Card Endpoints ====================

  @Post('decks/:deckId/cards')
  @ApiOperation({ summary: 'Add card to deck' })
  @ApiResponse({ status: 201, description: 'Card added successfully' })
  @ApiResponse({ status: 404, description: 'Deck or Kanji not found' })
  @ApiResponse({ status: 400, description: 'Card already exists in deck' })
  addCardToDeck(
    @Req() req: any,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() addCardDto: AddCardDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.addCardToDeck(deckId, userId, addCardDto);
  }

  @Get('cards/:cardId')
  @ApiOperation({ summary: 'Get card by ID' })
  @ApiResponse({ status: 200, description: 'Card retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  getCardDetail(@Req() req, @Param('cardId', ParseIntPipe) cardId: number) {
    const userId = req.user?.id || 1;
    return this.flashcardService.getCardDetail(cardId, userId);
  }

  @Delete('cards/:cardId')
  @ApiOperation({ summary: 'Remove card from deck' })
  @ApiResponse({ status: 200, description: 'Card removed successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  removeCardFromDeck(
    @Req() req: any,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.removeCardFromDeck(cardId, userId);
  }

  // ==================== Study Session Endpoints ====================

  @Post('decks/:deckId/study')
  @ApiOperation({ summary: 'Start a study session' })
  @ApiResponse({ status: 201, description: 'Study session started' })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  startStudySession(
    @Req() req: any,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() startStudyDto: StartStudyDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.startStudySession(deckId, userId, startStudyDto);
  }

  @Post('sessions/:sessionId/cards/:cardId/review')
  @ApiOperation({ summary: 'Submit a card review' })
  @ApiResponse({ status: 200, description: 'Review submitted successfully' })
  @ApiResponse({ status: 404, description: 'Session or Card not found' })
  reviewCard(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() reviewCardDto: ReviewCardDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.reviewCard(
      sessionId,
      cardId,
      userId,
      reviewCardDto,
    );
  }

  @Post('sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete study session' })
  @ApiResponse({ status: 200, description: 'Session completed' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  completeSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.completeSession(sessionId, userId);
  }

  @Post('sessions/:sessionId/pause')
  @ApiOperation({ summary: 'Pause active study session' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  pauseSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.pauseSession(sessionId, userId);
  }

  @Post('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume paused study session' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  resumeSession(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.resumeSession(sessionId, userId);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'List active or paused study sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully' })
  getActiveSessions(
    @Req() req: any,
    @Query('deckId') deckIdParam?: string,
  ) {
    const userId = req.user?.id || 1;
    const deckId = this.parseDeckId(deckIdParam);
    return this.flashcardService.getActiveSessions(userId, deckId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get detailed session data' })
  @ApiResponse({ status: 200, description: 'Session data retrieved successfully' })
  getSessionDetail(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.getSessionDetail(sessionId, userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get study history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  getStudyHistory(
    @Req() req: any,
    @Query('deckId') deckIdParam?: string,
  ) {
    const userId = req.user?.id || 1;
    const deckId = this.parseDeckId(deckIdParam);
    return this.flashcardService.getStudyHistory(userId, deckId);
  }

  @Put('decks/:deckId/reorder')
  reorderCards(
    @Req() req,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() body: ReorderCardsDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.reorderCards(deckId, userId, body.cardIds);
  }

  @Post('decks/:deckId/cards/bulk')
  bulkAddCards(
    @Req() req,
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() body: BulkAddCardsDto,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.bulkAddCards(deckId, userId, body.kanjiIds);
  }

  @Get('stats')
  getStats(@Req() req, @Query('deckId') deckIdParam?: string) {
    const userId = req.user?.id || 1;
    const deckId = this.parseDeckId(deckIdParam);
    return this.flashcardService.getStats(userId, deckId);
  }

  private parseDeckId(deckIdParam?: string): number | undefined {
    if (deckIdParam === undefined || deckIdParam === null) {
      return undefined;
    }

    const trimmed = deckIdParam.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('deckId must be an integer');
    }

    return parsed;
  }
}
