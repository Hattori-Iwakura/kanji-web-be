import { Module } from '@nestjs/common';
import { FlashcardDeckController } from './flashcard-deck.controller';
import { FlashcardDeckService } from './flashcard-deck.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [FlashcardDeckController],
  providers: [FlashcardDeckService, PrismaService],
  exports: [FlashcardDeckService],
})
export class FlashcardDeckModule {}
