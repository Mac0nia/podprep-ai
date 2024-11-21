export class RateLimiter {
  private requestCounts: Map<string, number>;
  private timestamps: Map<string, number>;
  private limits: Map<string, { requests: number; window: number }>;

  constructor() {
    this.requestCounts = new Map();
    this.timestamps = new Map();
    this.limits = new Map([
      ['google', { requests: 100, window: 86400000 }],  // 100 requests per day
      ['reddit', { requests: 60, window: 60000 }],      // 60 requests per minute
      ['medium', { requests: 30, window: 60000 }],      // 30 requests per minute
      ['substack', { requests: 30, window: 60000 }]     // 30 requests per minute
    ]);
  }

  async checkLimit(api: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.limits.get(api);
    
    if (!limit) return true;

    const lastTimestamp = this.timestamps.get(api) || 0;
    const count = this.requestCounts.get(api) || 0;

    // Reset counter if window has passed
    if (now - lastTimestamp > limit.window) {
      this.requestCounts.set(api, 1);
      this.timestamps.set(api, now);
      return true;
    }

    // Check if within limits
    if (count >= limit.requests) {
      const waitTime = limit.window - (now - lastTimestamp);
      throw new Error(`Rate limit exceeded for ${api}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // Increment counter
    this.requestCounts.set(api, count + 1);
    return true;
  }

  // Cache results to reduce API calls
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  async getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }
}
