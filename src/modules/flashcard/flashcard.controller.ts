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

  @Get('history')
  @ApiOperation({ summary: 'Get study history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  getStudyHistory(
    @Req() req: any,
    @Query('deckId', new ParseIntPipe({ optional: true })) deckId?: number,
  ) {
    const userId = req.user?.id || 1;
    return this.flashcardService.getStudyHistory(userId, deckId);
    return this.flashcardService.getStudyHistory(req.user.id, deckId);
  }
}
