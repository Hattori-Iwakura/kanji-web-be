import { Module } from '@nestjs/common';
import { FlashcardController } from './flashcard.controller';
import { FlashcardService } from './flashcard.service';
import { FlashcardRepository } from './flashcard.repo';
import { PublicDeckRequestController } from './public-deck-request.controller';
import { PublicDeckRequestService } from './public-deck-request.service';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user_profile/user_profile.module';

@Module({
  imports: [DbClientModule, AuthModule, UserProfileModule],
  controllers: [FlashcardController, PublicDeckRequestController],
  providers: [FlashcardService, FlashcardRepository, PublicDeckRequestService],
  exports: [FlashcardService, PublicDeckRequestService],
})
export class FlashcardModule {}
