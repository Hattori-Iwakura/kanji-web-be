import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { PredictKanjiDto, PredictResultDto, AiHealthDto } from './dtos/ai.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('predict')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predict kanji from image' })
  @ApiResponse({
    status: 200,
    description: 'Kanji predicted successfully',
    type: PredictResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image format',
  })
  @ApiResponse({
    status: 500,
    description: 'AI server error',
  })
  async predictKanji(@Body() dto: PredictKanjiDto): Promise<PredictResultDto> {
    return this.aiService.predictKanji(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI server health' })
  @ApiResponse({
    status: 200,
    description: 'AI server health status',
    type: AiHealthDto,
  })
  async checkHealth(): Promise<AiHealthDto> {
    return this.aiService.checkHealth();
  }
}
