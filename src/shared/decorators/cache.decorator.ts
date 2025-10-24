import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';
export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Enable caching for a route
 * @param ttl Time to live in milliseconds (optional)
 */
export const UseCache = (ttl?: number) => SetMetadata(CACHE_KEY, { enabled: true, ttl });

/**
 * Disable caching for a route
 */
export const NoCache = () => SetMetadata(CACHE_KEY, { enabled: false });
