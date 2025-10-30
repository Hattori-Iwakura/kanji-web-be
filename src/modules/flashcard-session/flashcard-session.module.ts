import { Module } from '@nestjs/common';
import { FlashcardSessionController } from './flashcard-session.controller';
import { FlashcardSessionService } from './flashcard-session.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FlashcardSessionController],
  providers: [FlashcardSessionService, PrismaService],
  exports: [FlashcardSessionService],
})
export class FlashcardSessionModule {}
