import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KanjiRecognitionService } from './kanji-recognition.service';
import { KanjiRecognitionController } from './kanji-recognition.controller';
import { AppConfigModule } from '../app_config/app_config.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for AI prediction
      maxRedirects: 5,
    }),
    AppConfigModule,
    AuthModule,
  ],
  controllers: [KanjiRecognitionController],
  providers: [KanjiRecognitionService],
  exports: [KanjiRecognitionService],
})
export class KanjiRecognitionModule {}
