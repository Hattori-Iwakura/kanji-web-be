/**
 * Cache Module Usage Examples
 * 
 * ⚠️ NOTE: This file contains example code for demonstration purposes only.
 * It is not meant to be imported or used in the actual application.
 * Use these patterns as a reference when implementing cache in your own services.
 * 
 * This file demonstrates various ways to use the cache module
 * in your NestJS services and controllers.
 */

import { Injectable, Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { UseCache, NoCache } from '../../shared/decorators/cache.decorator';

// ============================================
// EXAMPLE 1: Basic Cache Usage in Service
// ============================================

@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Simple get/set pattern
   */
  async getUserData(userId: string) {
    const cacheKey = this.cacheService.generateUserKey(userId, 'data');
    
    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const data = await this.fetchFromDatabase(userId);
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, data, 300000);
    
    return data;
  }

  /**
   * Using getOrSet helper (cleaner)
   */
  async getUserDataClean(userId: string) {
    const cacheKey = this.cacheService.generateUserKey(userId, 'data');
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchFromDatabase(userId),
      300000
    );
  }

  private async fetchFromDatabase(userId: string) {
    // Simulate database fetch
    return { id: userId, name: 'User Name' };
  }
}

// ============================================
// EXAMPLE 2: Cache with Query Parameters
// ============================================

@Injectable()
export class KanjiListService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly database: any, // Inject your repository here
  ) {}

  async getKanjiList(jlptLevel?: number, grade?: number, page = 1) {
    // Generate cache key including all parameters
    const cacheKey = this.cacheService.generateKey(
      'kanji',
      'list',
      `jlpt:${jlptLevel || 'all'}`,
      `grade:${grade || 'all'}`,
      `page:${page}`
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Fetch from database with filters
        return await this.database.findKanji({
          jlptLevel,
          grade,
          page
        });
      },
      600000 // Cache for 10 minutes
    );
  }
}

// ============================================
// EXAMPLE 3: Cache Invalidation on Updates
// ============================================

@Injectable()
export class UserProfileService {
  constructor(private readonly cacheService: CacheService) {}

  async getProfile(userId: string) {
    const cacheKey = this.cacheService.generateUserKey(userId, 'profile');
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.database.getProfile(userId),
      300000
    );
  }

  async updateProfile(userId: string, data: any) {
    // Update database
    const updated = await this.database.updateProfile(userId, data);
    
    // Invalidate cache
    const cacheKey = this.cacheService.generateUserKey(userId, 'profile');
    await this.cacheService.delete(cacheKey);
    
    return updated;
  }

  async deleteUser(userId: string) {
    // Delete from database
    await this.database.deleteUser(userId);
    
    // Invalidate all user-related cache
    await this.cacheService.deletePattern(`user:${userId}`);
  }

  private database = {
    getProfile: async (userId: string) => ({ userId }),
    updateProfile: async (userId: string, data: any) => ({ userId, ...data }),
    deleteUser: async (userId: string) => true,
  };
}

// ============================================
// EXAMPLE 4: Controller with Cache Decorators
// ============================================

@Controller('posts')
export class PostController {
  constructor(private readonly postService: any) {}

  /**
   * GET /posts - Cached for 10 minutes
   */
  @Get()
  @UseCache(600000)
  async getAllPosts() {
    return this.postService.findAll();
  }

  /**
   * GET /posts/:id - Cached for 5 minutes
   */
  @Get(':id')
  @UseCache(300000)
  async getPost(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  /**
   * POST /posts - No cache
   */
  @Post()
  @NoCache()
  async createPost(@Body() data: any) {
    return this.postService.create(data);
  }
}

// ============================================
// EXAMPLE 5: Multi-level Caching
// ============================================

@Injectable()
export class QuizService {
  constructor(private readonly cacheService: CacheService) {}

  async getQuiz(quizId: string, userId: string) {
    // Level 1: Cache quiz data (shared)
    const quizCacheKey = this.cacheService.generateKey('quiz', quizId);
    const quizData = await this.cacheService.getOrSet(
      quizCacheKey,
      () => this.database.getQuiz(quizId),
      3600000 // 1 hour - quiz data rarely changes
    );

    // Level 2: Cache user progress (user-specific)
    const progressCacheKey = this.cacheService.generateUserKey(
      userId,
      'quiz',
      quizId,
      'progress'
    );
    const progress = await this.cacheService.getOrSet(
      progressCacheKey,
      () => this.database.getUserProgress(userId, quizId),
      300000 // 5 minutes - progress changes more often
    );

    return {
      quiz: quizData,
      progress: progress,
    };
  }

  async submitQuiz(userId: string, quizId: string, answers: any) {
    // Save to database
    const result = await this.database.saveResults(userId, quizId, answers);
    
    // Invalidate progress cache
    const progressKey = this.cacheService.generateUserKey(
      userId,
      'quiz',
      quizId,
      'progress'
    );
    await this.cacheService.delete(progressKey);
    
    // Also invalidate user stats
    await this.cacheService.deletePattern(`user:${userId}:stats`);
    
    return result;
  }

  private database = {
    getQuiz: async (quizId: string) => ({ id: quizId, questions: [] }),
    getUserProgress: async (userId: string, quizId: string) => ({ score: 0 }),
    saveResults: async (userId: string, quizId: string, answers: any) => ({ saved: true }),
  };
}

// ============================================
// EXAMPLE 6: Conditional Caching
// ============================================

@Injectable()
export class StatisticsService {
  constructor(private readonly cacheService: CacheService) {}

  async getStatistics(userId: string, realtime = false) {
    // Skip cache if realtime data is requested
    if (realtime) {
      return await this.database.getStats(userId);
    }

    // Use cache for normal requests
    const cacheKey = this.cacheService.generateUserKey(userId, 'stats');
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.database.getStats(userId),
      180000 // 3 minutes
    );
  }

  private database = {
    getStats: async (userId: string) => ({ 
      totalKanji: 100, 
      masteredKanji: 50 
    }),
  };
}

// ============================================
// EXAMPLE 7: Batch Cache Operations
// ============================================

@Injectable()
export class BatchCacheService {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache() {
    const popularKanji = await this.database.getPopularKanji();
    
    for (const kanji of popularKanji) {
      const cacheKey = this.cacheService.generateKey('kanji', kanji.id);
      await this.cacheService.set(cacheKey, kanji, 3600000);
    }
  }

  /**
   * Invalidate multiple related caches
   */
  async invalidateUserCaches(userId: string) {
    const patterns = [
      `user:${userId}:profile`,
      `user:${userId}:progress`,
      `user:${userId}:achievements`,
      `user:${userId}:stats`,
    ];

    await Promise.all(
      patterns.map(pattern => this.cacheService.delete(pattern))
    );
  }

  private database = {
    getPopularKanji: async () => [
      { id: '1', character: '日' },
      { id: '2', character: '本' },
    ],
  };
}

// ============================================
// EXAMPLE 8: Error Handling
// ============================================

@Injectable()
export class RobustCacheService {
  constructor(private readonly cacheService: CacheService) {}

  async getData(userId: string) {
    const cacheKey = this.cacheService.generateUserKey(userId, 'data');
    
    try {
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Log but don't fail - continue to database
      console.error('Cache read error:', error);
    }

    // Fetch from database
    const data = await this.database.getData(userId);
    
    try {
      // Try to cache, but don't fail if it doesn't work
      await this.cacheService.set(cacheKey, data, 300000);
    } catch (error) {
      console.error('Cache write error:', error);
    }
    
    return data;
  }

  private database = {
    getData: async (userId: string) => ({ userId }),
  };
}

// ============================================
// Best Practices Summary
// ============================================

/**
 * 1. Cache Key Naming:
 *    - Use hierarchical structure: 'entity:id:subentity'
 *    - Include relevant parameters
 *    - Use generateKey() or generateUserKey()
 * 
 * 2. TTL Selection:
 *    - Static data: 1 hour+
 *    - User data: 3-5 minutes
 *    - Frequently updated: 1 minute
 *    - Don't cache real-time data
 * 
 * 3. Cache Invalidation:
 *    - Always invalidate on updates
 *    - Use patterns for bulk invalidation
 *    - Consider cascade invalidation
 * 
 * 4. Error Handling:
 *    - Cache failures shouldn't break app
 *    - Always fallback to source
 *    - Log cache errors
 * 
 * 5. Performance:
 *    - Cache expensive queries
 *    - Don't cache everything
 *    - Monitor hit/miss rates
 *    - Consider memory usage
 */
