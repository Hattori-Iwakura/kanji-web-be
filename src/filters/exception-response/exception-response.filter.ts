import { ArgumentsHost, Catch, ExceptionFilter, HttpException} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/modules/logger/logger.service';
import { ResponseDto } from 'src/shared/dto';

@Catch(HttpException)
export class ExceptionResponseFilter implements ExceptionFilter {

  constructor(private readonly logger: LoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost) {

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const requestId = (request as any).requestId || 'REQ-unknown';

    // Log lỗi
    this.logger.error(`[${requestId}] ❌ ${request.method} ${request.url} - ${status}`, exception instanceof Error ? exception.stack : exception);
    
    const res: ResponseDto = {
      statusCode: status,
      data: undefined,
      timestamp: new Date().toISOString(),
      error: exception.message
    }
    
    response
      .status(status)
      .json(res);

  }
}
