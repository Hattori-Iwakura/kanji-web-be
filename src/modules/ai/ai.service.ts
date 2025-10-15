import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AppConfigService } from '../app_config/app_config.service';
import { firstValueFrom } from 'rxjs';
import { PredictKanjiDto, PredictResultDto } from './dtos/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: AppConfigService,
  ) {
    // Get AI server URL from env or use default
    this.aiServerUrl =
      process.env.AI_SERVER_URL || 'http://127.0.0.1:8000';
    this.logger.log(`AI Server URL: ${this.aiServerUrl}`);
  }

  /**
   * Predict kanji from base64 image
   */
  async predictKanji(dto: PredictKanjiDto): Promise<PredictResultDto> {
    try {
      this.logger.debug(`Predicting kanji from image...`);
      this.logger.debug(`Calling: ${this.aiServerUrl}/api/v1/predict`); // Add this log

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServerUrl}/api/v1/predict`, {
          image: dto.image,
        }),
      );

      this.logger.debug(`AI Response: ${JSON.stringify(response.data)}`);

      return {
        character: response.data.character,
        confidence: response.data.confidence,
        top5: response.data.top5 || [],
      };
    } catch (error: any) {
      this.logger.error(`AI prediction failed: ${error.message}`);
      this.logger.error(`URL: ${this.aiServerUrl}/api/v1/predict`); // Add this log
      this.logger.error(`Status: ${error.response?.status}`); // Add this log

      if (error.response) {
        throw new HttpException(
          {
            statusCode: error.response.status,
            message: error.response.data?.message || 'AI prediction failed',
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
        this.httpService.get(`${this.aiServerUrl}/health`, {
          timeout: 5000,
        }),
      );

      return {
        status: 'healthy',
        message: response.data.message || 'AI server is running',
      };
    } catch (error) {
      this.logger.error(`AI health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        message: 'Cannot connect to AI server',
      };
    }
  }
}
