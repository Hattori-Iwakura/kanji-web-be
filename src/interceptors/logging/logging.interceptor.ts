import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggerService } from 'src/modules/logger/logger.service';
import { TRACE_HEADER_KEYS } from 'src/shared/constants/request-header';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = req.requestId

    const { method, url } = req;
    const start = Date.now();

    // Log đầu vào request
    this.logger.log(`[${requestId}] ➡️ ${method} ${url} - incoming request`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = res.statusCode;
          // Log khi request hoàn tất
          this.logger.log(
            `[${requestId}] ⬅️ ${method} ${url} - ${status} (${duration}ms)`
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = res.statusCode || 500;
          // Log khi request lỗi
          this.logger.error(
            `[${requestId}] ❌ ${method} ${url} - ${status} (${duration}ms)`,
            err.stack || err.message || err
          );
        },
      })
    );
  }
}
