import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { FlashcardService } from './flashcard.service';
import { FlashcardRepository } from './flashcard.repo';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbClientModule, AuthModule],
  controllers: [FlashcardController],
  providers: [FlashcardService, FlashcardRepository],
  exports: [FlashcardService],
})
export class FlashcardModule {}
