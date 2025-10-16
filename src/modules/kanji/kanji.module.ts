import { Module } from '@nestjs/common';
import { KanjiController } from './kanji.controller';
import { KanjiService } from './kanji.service';
import { KanjiRepository } from './kanji.repo';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [KanjiController],
  providers: [KanjiService, KanjiRepository]
})
export class KanjiModule {}
