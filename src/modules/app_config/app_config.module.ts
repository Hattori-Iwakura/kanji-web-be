import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app_config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      // Có thể inject ở mọi nơi
      envFilePath: '.env', // Đọc file .env
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
