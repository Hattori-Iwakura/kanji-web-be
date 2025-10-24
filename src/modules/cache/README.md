# Cache Module

## Overview
The Cache Module provides a centralized caching solution for the Kanji Web Backend application. It uses NestJS Cache Manager with in-memory storage to improve API response times and reduce database load.

## Features
- ✅ Global cache configuration
- ✅ Custom cache service with utility methods
- ✅ HTTP cache interceptor for automatic response caching
- ✅ Decorators for route-level cache control
- ✅ Cache invalidation support
- ✅ User-specific cache keys
- ✅ Debug logging

## Installation
The required packages are already installed:
```bash
npm install @nestjs/cache-manager cache-manager
```

## Configuration

### Module Setup
The cache module is configured in `src/modules/cache/cache.module.ts`:
```typescript
CacheModule.register({
  ttl: 300000, // 5 minutes
  max: 100,    // Max 100 items
  isGlobal: true,
})
```

### App Integration
The module is imported in `src/app.module.ts` and available globally.

## Usage

### 1. Using Cache Service (Recommended)

Inject the `CacheService` in your service or controller:

```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MyService {
  constructor(private readonly cacheService: CacheService) {}

  async getData(userId: string) {
    // Try to get from cache first
    const cacheKey = this.cacheService.generateUserKey(userId, 'data');
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const data = await this.database.getData(userId);
    
    // Store in cache for 5 minutes
    await this.cacheService.set(cacheKey, data, 300000);
    
    return data;
  }
}
```

### 2. Using getOrSet Helper

```typescript
async getData(userId: string) {
  const cacheKey = this.cacheService.generateUserKey(userId, 'data');
  
  return this.cacheService.getOrSet(
    cacheKey,
    async () => {
      // This function only runs if cache miss
      return await this.database.getData(userId);
    },
    300000 // TTL in milliseconds
  );
}
```

### 3. Using Cache Decorators

Apply cache decorators to controller methods:

```typescript
import { UseCache, NoCache } from '../../shared/decorators/cache.decorator';

@Controller('users')
export class UserController {
  
  @Get(':id')
  @UseCache(600000) // Cache for 10 minutes
  async getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Post()
  @NoCache() // Explicitly disable cache
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
```

## Cache Service Methods

### get<T>(key: string): Promise<T | undefined>
Get value from cache by key.

### set<T>(key: string, value: T, ttl?: number): Promise<void>
Set value in cache with optional TTL.

### delete(key: string): Promise<void>
Delete a specific cache entry.

### deletePattern(pattern: string): Promise<void>
Delete all cache entries matching a pattern.
*Note: Limited support with memory store. Use Redis for production.*

### reset(): Promise<void>
Clear all cache entries.

### getOrSet<T>(key, factory, ttl?): Promise<T>
Get from cache, or execute factory function and cache the result.

### generateKey(...parts): string
Generate a cache key from parts: `part1:part2:part3`

### generateUserKey(userId, ...parts): string
Generate user-specific key: `user:123:data:profile`

## Cache Invalidation

### Manual Invalidation
```typescript
// Delete specific cache
await this.cacheService.delete('user:123:profile');

// Delete all user cache
await this.cacheService.deletePattern('user:123');

// Clear all cache
await this.cacheService.reset();
```

### Automatic Invalidation Example
```typescript
async updateUserProfile(userId: string, data: any) {
  const result = await this.repository.update(userId, data);
  
  // Invalidate related cache
  await this.cacheService.delete(
    this.cacheService.generateUserKey(userId, 'profile')
  );
  
  return result;
}
```

## HTTP Cache Interceptor

The `HttpCacheInterceptor` automatically caches GET requests:

```typescript
// Auto-enabled globally via CacheModule
// Caches GET requests with user-specific keys
// Skips: /health, /metrics
```

To disable for specific routes, use `@NoCache()` decorator.

## Best Practices

### 1. Cache Key Naming
Use consistent, hierarchical naming:
```typescript
'user:{userId}:profile'
'user:{userId}:achievements'
'kanji:list:jlpt:{level}'
'quiz:{id}:questions'
```

### 2. TTL Selection
- Static data: 1 hour (3600000ms)
- User data: 5 minutes (300000ms)
- Frequently updated: 1 minute (60000ms)
- Real-time data: Don't cache

### 3. Cache Invalidation
Always invalidate cache when data changes:
```typescript
// After create/update/delete
await this.cacheService.delete(cacheKey);
```

### 4. Error Handling
Cache operations should never break your app:
```typescript
try {
  const cached = await this.cacheService.get(key);
  if (cached) return cached;
} catch (error) {
  // Log but continue to fetch from source
  this.logger.warn('Cache error:', error);
}
```

## Production Considerations

### Switch to Redis
For production, replace memory store with Redis:

1. Install Redis packages:
```bash
npm install cache-manager-redis-store redis
```

2. Update cache.module.ts:
```typescript
import * as redisStore from 'cache-manager-redis-store';

CacheModule.register({
  store: redisStore,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  ttl: 300,
  max: 1000,
})
```

### Environment Variables
Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=300000
CACHE_MAX_ITEMS=1000
```

## Examples in Codebase

### Achievement Controller
```typescript
@Get()
@UseCache(600000) // Cache for 10 minutes
async getAllAchievements(@Query('category') category?: AchievementCategory) {
  return this.achievementService.getAllAchievements(category);
}
```

### Achievement Service
```typescript
async checkAndUnlockAchievements(userId: number) {
  // ... unlock logic ...
  
  // Invalidate cache after unlocking
  if (newlyUnlocked.length > 0) {
    await this.cacheService.deletePattern(`http:${userId}:/achievements/user`);
    await this.cacheService.deletePattern(`http:${userId}:/achievements/stats`);
  }
  
  return result;
}
```

## Monitoring

### Cache Hit/Miss Logging
The cache service logs all operations:
```
[CacheService] Cache hit for key: user:123:profile
[CacheService] Cache miss for key: user:456:data
[CacheService] Cache set for key: user:789:achievements
```

### Performance Metrics
Monitor cache effectiveness:
- Cache hit rate
- Response time improvement
- Memory usage

## Troubleshooting

### Cache not working
1. Check if CacheModule is imported in AppModule
2. Verify CacheService is injected correctly
3. Check cache key matches when getting/setting
4. Review TTL configuration

### Memory issues
1. Reduce `max` items in cache config
2. Lower TTL for large objects
3. Consider switching to Redis
4. Implement selective caching

## Future Enhancements
- [ ] Redis integration for production
- [ ] Cache warming strategies
- [ ] Advanced pattern deletion with Redis SCAN
- [ ] Cache metrics endpoint
- [ ] Distributed cache synchronization
- [ ] Cache compression for large objects
