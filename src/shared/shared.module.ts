import { Module, Global } from '@nestjs/common';
import { FuriganaService } from './services/furigana.service';

@Global()
@Module({
  providers: [FuriganaService],
  exports: [FuriganaService],
})
export class SharedModule {}
