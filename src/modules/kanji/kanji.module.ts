import { Module } from '@nestjs/common';
import { KanjiService } from './kanji.service';
import { KanjiController } from './kanji.controller';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [KanjiController],
  providers: [KanjiService, PrismaService],
  exports: [KanjiService],
})
export class KanjiModule {}
