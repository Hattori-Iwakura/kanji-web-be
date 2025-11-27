import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizRepo } from './quiz.repo';
import { DbClientModule } from '../db_client/db_client.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbClientModule, AuthModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepo],
  exports: [QuizService, QuizRepo],
})
export class QuizModule {}
