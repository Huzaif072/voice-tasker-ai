import { getRedis } from "./client";

export async function rateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return { success: true, remaining: limit };

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  } catch (error) {
    console.warn("[Redis] Rate-limit check unavailable; allowing request", error);
    return { success: true, remaining: limit };
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.warn("[Redis] Cache read unavailable", error);
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn("[Redis] Cache write unavailable", error);
  }
}

const CACHE_DELETE_BATCH_SIZE = 100;

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: CACHE_DELETE_BATCH_SIZE,
      });
      if (keys.length > 0) {
        for (let index = 0; index < keys.length; index += CACHE_DELETE_BATCH_SIZE) {
          const batch = keys.slice(index, index + CACHE_DELETE_BATCH_SIZE);
          await redis.del(...batch);
        }
      }
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch (error) {
    console.warn("[Redis] Cache invalidation unavailable", error);
  }
}
