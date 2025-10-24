import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KanjiRecognitionService } from './kanji-recognition.service';
import { RecognizeKanjiDto, RecognitionResultDto } from './dtos';

@ApiTags('Kanji Recognition')
@Controller('kanji-recognition')
export class KanjiRecognitionController {
  constructor(
    private readonly kanjiRecognitionService: KanjiRecognitionService,
  ) {}

  @Post('recognize')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recognize kanji from canvas drawing' })
  @ApiResponse({
    status: 200,
    description: 'Kanji recognized successfully',
    type: RecognitionResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'AI server error',
  })
  async recognizeKanji(
    @Body() dto: RecognizeKanjiDto,
  ): Promise<RecognitionResultDto> {
    return this.kanjiRecognitionService.recognizeKanji(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI server health' })
  @ApiResponse({
    status: 200,
    description: 'AI server health status',
  })
  async checkHealth(): Promise<{ status: string; message: string }> {
    return this.kanjiRecognitionService.checkHealth();
  }
}
