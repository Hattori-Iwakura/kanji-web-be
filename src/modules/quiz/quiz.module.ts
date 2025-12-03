import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepo } from './quiz.repo';
import { PublicQuizRequestController } from './public-quiz-request.controller';
import { PublicQuizRequestService } from './public-quiz-request.service';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbClientModule, AuthModule],
  controllers: [QuizController, PublicQuizRequestController],
  providers: [QuizService, QuizRepo, PublicQuizRequestService],
  exports: [QuizService, QuizRepo, PublicQuizRequestService],
})
export class QuizModule {}
