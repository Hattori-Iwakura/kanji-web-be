import { Module } from '@nestjs/common';
import { FlashcardService } from './flashcard.service';
import { FlashcardController } from './flashcard.controller';
import { AuthModule } from '../auth/auth.module';
import { FlashcardRepository } from './flashcard.repo';
import { DbClientModule } from '../db_client/db_client.module';

@Module({
  imports: [AuthModule, DbClientModule],
  providers: [FlashcardService, FlashcardRepository],
  controllers: [FlashcardController],
  exports: [FlashcardService]
})
export class FlashcardModule {}
