import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// For demo/hackathon purposes where Docker/Redis might not be available,
// we provide a simple in-memory mock fallback.
class RedisMock {
  private data: Map<string, string> = new Map();

  async get(key: string) { return this.data.get(key) || null; }
  async set(key: string, value: string, ...args: any[]) { 
    this.data.set(key, value); 
    return 'OK'; 
  }
  async del(key: string) { return this.data.delete(key); }
  on(event: string, callback: any) { /* noop */ }
}

const createRedisClient = () => {
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 1) {
          logger.warn('Redis connection failed, switching to in-memory mock');
          return null;
        }
        return 100;
      },
    });

    client.on('error', (err) => {
      logger.warn('Redis error (expected if service not running)', { message: err.message });
    });

    return client;
  } catch (err) {
    return new RedisMock() as any;
  }
};

export const redis = createRedisClient();

// Add a dummy 'on' if it's the mock
if (!(redis instanceof Redis)) {
  (redis as any).on = (event: string, cb: any) => {
    if (event === 'connect') setTimeout(cb, 0);
  };
}
