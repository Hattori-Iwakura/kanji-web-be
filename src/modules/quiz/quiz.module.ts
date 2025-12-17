import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepo } from './quiz.repo';
import { PublicQuizRequestController } from './public-quiz-request.controller';
import { PublicQuizRequestService } from './public-quiz-request.service';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user_profile/user_profile.module';

@Module({
  imports: [DbClientModule, AuthModule, UserProfileModule],
  controllers: [QuizController, PublicQuizRequestController],
  providers: [QuizService, QuizRepo, PublicQuizRequestService],
  exports: [QuizService, QuizRepo, PublicQuizRequestService],
})
export class QuizModule {}
