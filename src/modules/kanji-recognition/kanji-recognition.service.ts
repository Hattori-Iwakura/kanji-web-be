import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RecognizeKanjiDto, RecognitionResultDto } from './dtos';

@Injectable()
export class KanjiRecognitionService {
  private readonly logger = new Logger(KanjiRecognitionService.name);
  private readonly aiServerUrl: string;

  constructor(private readonly httpService: HttpService) {
    // Get AI server URL from env or use default
    this.aiServerUrl =
      process.env.AI_SERVER_URL || 'http://localhost:8000';
    this.logger.log(`🤖 AI Server URL: ${this.aiServerUrl}`);
  }

  /**
   * Recognize kanji from canvas drawing (base64 image)
   */
  async recognizeKanji(
    dto: RecognizeKanjiDto,
  ): Promise<RecognitionResultDto> {
    try {
      this.logger.debug(`📸 Recognizing kanji from canvas drawing...`);
      this.logger.debug(
        `📡 Calling: ${this.aiServerUrl}/api/v1/predict`,
      );

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServerUrl}/api/v1/predict`, {
          image: dto.image,
        }),
      );

      this.logger.debug(`✅ AI Response received`);

      return {
        character: response.data.character,
        confidence: response.data.confidence,
        top5: response.data.top5 || [],
      };
    } catch (error: any) {
      this.logger.error(`❌ AI prediction failed: ${error.message}`);
      this.logger.error(`URL: ${this.aiServerUrl}/api/v1/predict`);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(
          `Response: ${JSON.stringify(error.response.data)}`,
        );

        throw new HttpException(
          {
            statusCode: error.response.status,
            message:
              error.response.data?.message || 'Kanji recognition failed',
            error: error.response.data?.error || 'AI_ERROR',
          },
          error.response.status,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to connect to AI server',
          error: 'AI_CONNECTION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check for AI server
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServerUrl}/api/v1/health`, {
          timeout: 5000,
        }),
      );

      return {
        status: response.data.status || 'healthy',
        message: response.data.message || 'AI server is running',
      };
    } catch (error: any) {
      this.logger.error(`❌ AI health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        message: 'Cannot connect to AI server',
      };
    }
  }
}
