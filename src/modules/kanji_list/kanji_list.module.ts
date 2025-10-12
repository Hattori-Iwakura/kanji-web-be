import { Module } from '@nestjs/common';
import { KanjiListController } from './kanji_list.controller';
import { KanjiListService } from './kanji_list.service';
import { KanjiListRepository } from './kanji_list.repo';

@Module({
  controllers: [KanjiListController],
  providers: [KanjiListService, KanjiListRepository],
  exports: [KanjiListService]
})
export class KanjiListModule {}
