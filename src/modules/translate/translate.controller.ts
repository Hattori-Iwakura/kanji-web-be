import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateDto } from './dto/translate.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';

@Controller('translate')
@UseGuards(JwtGuard)
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  async translate(@Body() translateDto: TranslateDto) {
    const result = await this.translateService.translate(translateDto);
    console.log('Controller returning:', result);
    return result;
  }
}
