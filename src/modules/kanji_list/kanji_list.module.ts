import { Module } from '@nestjs/common';
import { KanjiListController } from './kanji_list.controller';
import { KanjiListService } from './kanji_list.service';
import { KanjiListRepository } from './kanji_list.repo';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user_profile/user_profile.module';

@Module({
  imports: [AuthModule, UserProfileModule],
  controllers: [KanjiListController],
  providers: [KanjiListService, KanjiListRepository],
  exports: [KanjiListService]
})
export class KanjiListModule {}
