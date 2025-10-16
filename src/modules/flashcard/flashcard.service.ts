import { Injectable } from '@nestjs/common';
import { FlashcardRepository } from './flashcard.repo';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { AddCardDto } from './dto/add-card.dto';
import { StartStudyDto } from './dto/start-study.dto';
import { ReviewCardDto } from './dto/review-card.dto';

@Injectable()
export class FlashcardService {
  constructor(private readonly repo: FlashcardRepository) {}

  createDeck(userId: number, dto: CreateDeckDto) {
    return this.repo.createDeck(userId, dto);
  }

  getUserDecks(userId: number) {
    return this.repo.getUserDecks(userId);
  }

  getDeckById(deckId: number, userId: number) {
    return this.repo.getDeckById(deckId, userId);
  }

  updateDeck(deckId: number, userId: number, dto: UpdateDeckDto) {
    return this.repo.updateDeck(deckId, userId, dto);
  }

  deleteDeck(deckId: number, userId: number) {
    return this.repo.deleteDeck(deckId, userId);
  }

  addCardToDeck(deckId: number, userId: number, dto: AddCardDto) {
    return this.repo.addCardToDeck(deckId, userId, dto);
  }

  removeCardFromDeck(cardId: number, userId: number) {
    return this.repo.removeCardFromDeck(cardId, userId);
  }

  getCardDetail(cardId: number, userId: number) {
    return this.repo.getCardDetail(cardId, userId);
  }

  reorderCards(deckId: number, userId: number, ids: number[]) {
    return this.repo.reorderCards(deckId, userId, ids);
  }

  bulkAddCards(deckId: number, userId: number, kanjiIds: number[]) {
    return this.repo.bulkAddCards(deckId, userId, kanjiIds);
  }

  startStudySession(deckId: number, userId: number, dto: StartStudyDto) {
    return this.repo.startStudySession(deckId, userId, dto);
  }

  reviewCard(sessionId: number, cardId: number, userId: number, dto: ReviewCardDto) {
    return this.repo.reviewCard(sessionId, cardId, userId, dto);
  }

  completeSession(sessionId: number, userId: number) {
    return this.repo.completeSession(sessionId, userId);
  }

  pauseSession(sessionId: number, userId: number) {
    return this.repo.pauseSession(sessionId, userId);
  }

  resumeSession(sessionId: number, userId: number) {
    return this.repo.resumeSession(sessionId, userId);
  }

  getSessionDetail(sessionId: number, userId: number) {
    return this.repo.getSessionDetail(sessionId, userId);
  }

  getActiveSessions(userId: number, deckId?: number) {
    return this.repo.getActiveSessions(userId, deckId);
  }

  getStudyHistory(userId: number, deckId?: number) {
    return this.repo.getStudyHistory(userId, deckId);
  }

  getStats(userId: number, deckId?: number) {
    return this.repo.getStats(userId, deckId);
  }
}
