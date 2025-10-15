import { Module } from '@nestjs/common';
import { KanjiListController } from './kanji_list.controller';
import { KanjiListService } from './kanji_list.service';
import { KanjiListRepository } from './kanji_list.repo';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [KanjiListController],
  providers: [KanjiListService, KanjiListRepository],
  exports: [KanjiListService]
})
export class KanjiListModule {}
