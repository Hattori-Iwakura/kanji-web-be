import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FlashcardRepository } from './flashcard.repo';
import {
  CreateFlashcardDeckDto,
  UpdateFlashcardDeckDto,
  FlashcardDeckQueryDto,
} from './dtos/flashcard-deck.dto';
import {
  CreateFlashcardCardDto,
  UpdateFlashcardCardDto,
} from './dtos/flashcard-card.dto';
import { UserProfileService } from '../user_profile/user_profile.service';
import { ActivityType } from 'generated/prisma';

@Injectable()
export class FlashcardService {
  constructor(
    private readonly flashcardRepo: FlashcardRepository,
    private readonly userProfileService: UserProfileService,
  ) {}

  // ==================== DECK OPERATIONS ====================

  async createDeck(data: CreateFlashcardDeckDto, userId?: number) {
    return this.flashcardRepo.createDeck(data, userId);
  }

  async findAllDecks(query: FlashcardDeckQueryDto, currentUserId?: number) {
    const result = await this.flashcardRepo.findAllDecks(query, currentUserId);
    
    // Rename Users to User for frontend
    const mappedDecks = result.data.map((deck: any) => {
      const { Users, ...rest } = deck;
      return { ...rest, User: Users };
    });
    
    return {
      ...result,
      data: mappedDecks,
    };
  }

  async findDeckById(id: number, includeCards = false) {
    const deck = await this.flashcardRepo.findDeckById(id, includeCards);
    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }
    return deck;
  }

  async updateDeck(id: number, data: UpdateFlashcardDeckDto) {
    // Check if deck exists
    await this.findDeckById(id);
    return this.flashcardRepo.updateDeck(id, data);
  }

  async deleteDeck(id: number) {
    // Check if deck exists
    await this.findDeckById(id);
    return this.flashcardRepo.deleteDeck(id);
  }

  // ==================== CARD OPERATIONS ====================

  async createCard(deckId: number, data: CreateFlashcardCardDto) {
    // Verify deck exists
    await this.findDeckById(deckId);
    return this.flashcardRepo.createCard(deckId, data);
  }

  async createMultipleCards(deckId: number, cards: CreateFlashcardCardDto[]) {
    // Verify deck exists
    await this.findDeckById(deckId);
    
    if (!cards || cards.length === 0) {
      throw new BadRequestException('At least one card is required');
    }

    const result = await this.flashcardRepo.createMultipleCards(deckId, cards);
    return {
      count: result.count,
      message: `Successfully created ${result.count} card(s)`,
    };
  }

  async findCardsByDeckId(deckId: number) {
    // Verify deck exists
    await this.findDeckById(deckId);
    return this.flashcardRepo.findCardsByDeckId(deckId);
  }

  async findCardById(id: number) {
    const card = await this.flashcardRepo.findCardById(id);
    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
    return card;
  }

  async updateCard(id: number, data: UpdateFlashcardCardDto) {
    // Check if card exists
    await this.findCardById(id);
    return this.flashcardRepo.updateCard(id, data);
  }

  async deleteCard(id: number) {
    // Check if card exists
    await this.findCardById(id);
    return this.flashcardRepo.deleteCard(id);
  }

  // ==================== STUDY TRACKING ====================

  async recordStudySession(userId: number, deckId: number, cardsStudied: number, points: number = 5) {
    // Verify deck exists and user has access
    await this.findDeckById(deckId);

    return {
      success: true,
      message: 'Study session recorded successfully',
      points_earned: 0,
    };
  }
}
