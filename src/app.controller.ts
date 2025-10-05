import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { AppConfigService } from './modules/app_config/app_config.service';
import { json } from 'stream/consumers';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  test(@Req() req) {
    // lấy requestId nếu middleware gắn
    const requestId = req.requestId || 'unknown';
    return {
      requestId,
      headers: req.headers
    };
  }
}
