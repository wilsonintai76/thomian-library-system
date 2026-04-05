import { Bindings } from './utils'

export const CACHE_KEYS = {
  STATS: 'cache:catalog:stats',
  SYSTEM_CONFIG: 'cache:system:config',
  AI_INSIGHTS: 'cache:catalog:ai_insights',
} as const;

export class CacheService {
  constructor(private kv: any) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.kv.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async put(key: string, value: any, ttlSeconds: number = 600): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    await this.kv.put(key, data, { expirationTtl: ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

export const getCache = (kv: any) => new CacheService(kv);
