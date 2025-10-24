import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../modules/cache/cache.service';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Skip caching for certain routes
    const skipCacheRoutes = ['/health', '/metrics'];
    if (skipCacheRoutes.some((route) => request.url.includes(route))) {
      return next.handle();
    }

    // Generate cache key
    const userId = request.user?.sid || 'anonymous';
    const cacheKey = this.cacheService.generateKey(
      'http',
      userId,
      request.url,
    );

    // Try to get from cache
    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // If not in cache, continue and cache the response
    return next.handle().pipe(
      tap(async (response) => {
        // Cache for 5 minutes by default
        await this.cacheService.set(cacheKey, response, 300000);
      }),
    );
  }
}
