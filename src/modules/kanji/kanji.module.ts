import { Module } from '@nestjs/common';
import { KanjiController } from './kanji.controller';
import { KanjiService } from './kanji.service';
import { KanjiRepository } from './kanji.repo';

@Module({
  controllers: [KanjiController],
  providers: [KanjiService, KanjiRepository]
})
export class KanjiModule {}
