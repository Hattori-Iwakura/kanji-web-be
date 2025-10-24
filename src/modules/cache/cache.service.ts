import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete all values matching pattern
   * Note: This is a simplified implementation for memory store
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // For memory store, we can't easily iterate keys
      // This is a placeholder for pattern deletion
      // For production with Redis, you'd use SCAN with pattern
      this.logger.debug(
        `Pattern deletion requested for: ${pattern} (not fully supported with memory store)`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting cache for pattern ${pattern}:`,
        error,
      );
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // Use store.reset() if available
      const store = (this.cacheManager as any).store;
      if (store && typeof store.reset === 'function') {
        await store.reset();
        this.logger.debug('Cache cleared');
      } else {
        this.logger.warn('Cache reset not supported by current store');
      }
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get or set cache (get from cache, if not exists, set it)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Generate cache key from parts
   */
  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  /**
   * Generate user-specific cache key
   */
  generateUserKey(userId: string, ...parts: (string | number)[]): string {
    return this.generateKey('user', userId, ...parts);
  }
}
