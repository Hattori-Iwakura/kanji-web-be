import { Module } from '@nestjs/common';
import { KanjiListController } from './kanji-list.controller';
import { KanjiListService } from './kanji-list.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [KanjiListController],
  providers: [KanjiListService, PrismaService],
  exports: [KanjiListService],
})
export class KanjiListModule {}
