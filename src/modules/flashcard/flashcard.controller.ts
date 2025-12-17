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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FlashcardService } from './flashcard.service';
import {
  CreateFlashcardDeckDto,
  UpdateFlashcardDeckDto,
  FlashcardDeckQueryDto,
} from './dtos/flashcard-deck.dto';
import {
  CreateFlashcardCardDto,
  UpdateFlashcardCardDto,
  BulkCreateFlashcardCardDto,
} from './dtos/flashcard-card.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { OptionalJwtGuard } from '../auth/guard/optional-jwt.guard';
import { ErrorCode } from 'src/shared/error/error_code';

@ApiTags('Flashcard')
@Controller('flashcard')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  // ==================== DECK ENDPOINTS ====================

  @Get('decks')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Lấy danh sách flashcard decks' })
  @ApiResponse({ status: 200, description: 'Danh sách decks' })
  async getAllDecks(@Query() query: FlashcardDeckQueryDto, @Req() req?: any) {
    try {
      const userId = req?.user?.id; // Get user ID from JWT if authenticated
      return await this.flashcardService.findAllDecks(query, userId);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to retrieve decks',
      });
    }
  }

  @Get('decks/:id')
  @ApiOperation({ summary: 'Lấy thông tin deck theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin deck' })
  @ApiResponse({ status: 404, description: 'Deck không tồn tại' })
  async getDeckById(
    @Param('id', ParseIntPipe) id: number,
    @Query('include_cards') includeCards?: string,
  ) {
    const deck = await this.flashcardService.findDeckById(id, includeCards === 'true');
    if (!deck) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Deck not found',
      });
    }
    return deck;
  }

  @UseGuards(JwtGuard)
  @Post('decks')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo flashcard deck mới' })
  @ApiResponse({ status: 201, description: 'Deck đã được tạo' })
  async createDeck(@Body() data: CreateFlashcardDeckDto, @Req() req: any) {
    try {
      const userId = req.user?.id;
      return await this.flashcardService.createDeck(data, userId);
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create deck',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Put('decks/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật deck' })
  @ApiResponse({ status: 200, description: 'Deck đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Deck không tồn tại' })
  async updateDeck(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateFlashcardDeckDto,
  ) {
    try {
      return await this.flashcardService.updateDeck(id, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to update deck',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Delete('decks/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa deck' })
  @ApiResponse({ status: 200, description: 'Deck đã được xóa' })
  @ApiResponse({ status: 404, description: 'Deck không tồn tại' })
  async deleteDeck(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.flashcardService.deleteDeck(id);
      return { message: 'Deck deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to delete deck',
      });
    }
  }

  // ==================== CARD ENDPOINTS ====================

  @Get('decks/:deckId/cards')
  @ApiOperation({ summary: 'Lấy danh sách cards trong deck' })
  @ApiResponse({ status: 200, description: 'Danh sách cards' })
  async getCardsByDeckId(@Param('deckId', ParseIntPipe) deckId: number) {
    try {
      return await this.flashcardService.findCardsByDeckId(deckId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to retrieve cards',
      });
    }
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Lấy thông tin card theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin card' })
  @ApiResponse({ status: 404, description: 'Card không tồn tại' })
  async getCardById(@Param('id', ParseIntPipe) id: number) {
    const card = await this.flashcardService.findCardById(id);
    if (!card) {
      throw new NotFoundException({
        code: ErrorCode.NotFound,
        message: 'Card not found',
      });
    }
    return card;
  }

  @UseGuards(JwtGuard)
  @Post('decks/:deckId/cards')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm card vào deck' })
  @ApiResponse({ status: 201, description: 'Card đã được tạo' })
  async createCard(
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() data: CreateFlashcardCardDto,
  ) {
    try {
      return await this.flashcardService.createCard(deckId, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create card',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Post('decks/:deckId/cards/bulk')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm nhiều cards vào deck' })
  @ApiResponse({ status: 201, description: 'Cards đã được tạo' })
  async createMultipleCards(
    @Param('deckId', ParseIntPipe) deckId: number,
    @Body() data: BulkCreateFlashcardCardDto,
  ) {
    try {
      return await this.flashcardService.createMultipleCards(deckId, data.cards);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to create cards',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Put('cards/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật card' })
  @ApiResponse({ status: 200, description: 'Card đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Card không tồn tại' })
  async updateCard(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateFlashcardCardDto,
  ) {
    try {
      return await this.flashcardService.updateCard(id, data);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to update card',
      });
    }
  }

  @UseGuards(JwtGuard)
  @Delete('cards/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa card' })
  @ApiResponse({ status: 200, description: 'Card đã được xóa' })
  @ApiResponse({ status: 404, description: 'Card không tồn tại' })
  async deleteCard(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.flashcardService.deleteCard(id);
      return { message: 'Card deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: 'Failed to delete card',
      });
    }
  }

  // ==================== STUDY TRACKING ====================

  @UseGuards(JwtGuard)
  @Post('study/record')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ghi nhận phiên học flashcard' })
  @ApiResponse({ status: 200, description: 'Phiên học đã được ghi nhận' })
  async recordStudySession(@Body() data: { deck_id: number; cards_studied: number }, @Req() req: any) {
    try {
      const userId = req.user.id;
      return await this.flashcardService.recordStudySession(
        userId,
        data.deck_id,
        data.cards_studied,
      );
    } catch (error) {
      throw new BadRequestException({
        code: ErrorCode.BadRequest,
        message: error.message || 'Failed to record study session',
      });
    }
  }
}
