import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ResponseDto } from 'src/shared/dto';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        // Skip if already wrapped (prevent double wrapping in tests)
        if (data && typeof data === 'object' && 'statusCode' in data && 'timestamp' in data) {
          return data;
        }
        
        const res: ResponseDto = {
          statusCode: response.statusCode ?? 200,
          data: data,
          timestamp: new Date().toISOString()
        };
        return res;
      }),
    );
  }
}
