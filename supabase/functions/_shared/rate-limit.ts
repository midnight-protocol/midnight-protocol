/**
 * Simple in-memory rate limiting for Supabase Edge Functions
 * Note: This is a basic implementation. For production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for the rate limit key
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns true if the request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Get client identifier from request
 * Uses IP address or falls back to a hash of headers
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from various headers
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             req.headers.get('cf-connecting-ip') || // Cloudflare
             'unknown';
  
  if (ip !== 'unknown') {
    return ip;
  }
  
  // Fallback: create identifier from headers
  const userAgent = req.headers.get('user-agent') || '';
  const acceptLanguage = req.headers.get('accept-language') || '';
  const acceptEncoding = req.headers.get('accept-encoding') || '';
  
  // Simple hash function for the fallback
  const str = `${userAgent}:${acceptLanguage}:${acceptEncoding}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `client:${hash}`;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): HeadersInit {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetTime / 1000).toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
  };
}