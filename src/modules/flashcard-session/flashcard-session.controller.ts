import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FlashcardSessionService } from './flashcard-session.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import {
  StartSessionDto,
  StartSessionResponseDto,
  ReviewCardDto,
  ReviewCardResponseDto,
  SessionProgressDto,
  CompleteSessionResponseDto,
  NextCardDto,
  DueCardsQueryDto,
  DueCardsResponseDto,
  StudyStatisticsQueryDto,
  StudyStatisticsResponseDto,
  DeckStatisticsDto,
} from './dto/flashcard-session.dto';

@ApiTags('Flashcard Sessions')
@Controller('flashcard-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FlashcardSessionController {
  constructor(private readonly sessionService: FlashcardSessionService) {}

  // ==================== SESSION MANAGEMENT ====================

  @Post('start')
  @ApiOperation({ summary: 'Start a new flashcard study session' })
  @ApiResponse({
    status: 201,
    description: 'Session started successfully',
    type: StartSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No cards available for study' })
  @ApiResponse({ status: 404, description: 'Deck not found or access denied' })
  async startSession(
    @Req() req: any,
    @Body() dto: StartSessionDto,
  ): Promise<StartSessionResponseDto> {
    return this.sessionService.startSession(req.user.id, dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session progress' })
  @ApiResponse({
    status: 200,
    description: 'Session progress retrieved',
    type: SessionProgressDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionProgress(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: any,
  ): Promise<SessionProgressDto> {
    return this.sessionService.getSessionProgress(sessionId, req.user.id);
  }

  @Get(':sessionId/next-card')
  @ApiOperation({ summary: 'Get the next card in the session' })
  @ApiResponse({
    status: 200,
    description: 'Next card retrieved',
    type: NextCardDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found or no more cards' })
  async getNextCard(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: any,
  ): Promise<NextCardDto> {
    return this.sessionService.getNextCard(sessionId, req.user.id);
  }

  @Post(':sessionId/review/:cardId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Review a card with SM-2 spaced repetition' })
  @ApiResponse({
    status: 200,
    description: 'Card reviewed successfully',
    type: ReviewCardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session or card not found' })
  async reviewCard(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Req() req: any,
    @Body() dto: ReviewCardDto,
  ): Promise<ReviewCardResponseDto> {
    return this.sessionService.reviewCard(sessionId, cardId, req.user.id, dto);
  }

  @Post(':sessionId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete the study session' })
  @ApiResponse({
    status: 200,
    description: 'Session completed successfully',
    type: CompleteSessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found or already completed' })
  async completeSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: any,
  ): Promise<CompleteSessionResponseDto> {
    return this.sessionService.completeSession(sessionId, req.user.id);
  }

  // ==================== STATISTICS & TRACKING ====================

  @Get('due-cards/:deckId')
  @ApiOperation({ summary: 'Get due cards count for a deck' })
  @ApiResponse({
    status: 200,
    description: 'Due cards count retrieved',
    type: DueCardsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Deck not found or access denied' })
  async getDueCards(
    @Param('deckId', ParseIntPipe) deckId: number,
    @Req() req: any,
  ): Promise<DueCardsResponseDto> {
    return this.sessionService.getDueCards(req.user.id, { deckId });
  }

  @Get('statistics/study')
  @ApiOperation({ summary: 'Get study statistics with daily breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Study statistics retrieved',
    type: StudyStatisticsResponseDto,
  })
  async getStudyStatistics(
    @Req() req: any,
    @Query() dto: StudyStatisticsQueryDto,
  ): Promise<StudyStatisticsResponseDto> {
    return this.sessionService.getStudyStatistics(req.user.id, dto);
  }

  @Get('statistics/deck/:deckId')
  @ApiOperation({ summary: 'Get detailed deck statistics' })
  @ApiResponse({
    status: 200,
    description: 'Deck statistics retrieved',
    type: DeckStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Deck not found or access denied' })
  async getDeckStatistics(
    @Param('deckId', ParseIntPipe) deckId: number,
    @Req() req: any,
  ): Promise<DeckStatisticsDto> {
    return this.sessionService.getDeckStatistics(req.user.id, deckId);
  }
}
