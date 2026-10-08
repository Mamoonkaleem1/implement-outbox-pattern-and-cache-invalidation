import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,

      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis retry exhausted');
          }

          return retries * 500;
        },
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis Error: ${error.message}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting');
    });

    this.client.on('end', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Store data
   */

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const data = JSON.stringify(value);

      if (ttl) {
        await this.client.set(key, data, {
          EX: ttl,
        });
      } else {
        await this.client.set(key, data);
      }
    } catch (error) {
      this.logger.error(`Redis SET failed: ${error.message}`);
    }
  }

  /**
   * Get data
   */

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Redis GET failed: ${error.message}`);

      return null;
    }
  }

  /**
   * Delete key
   */

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DELETE failed: ${error.message}`);
    }
  }

  /**
   * Check key exists
   */

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);

      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS failed: ${error.message}`);

      return false;
    }
  }

  /**
   * Set expiration
   */

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE failed: ${error.message}`);
    }
  }

  /**
   * Get remaining TTL
   */

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Redis TTL failed: ${error.message}`);

      return -1;
    }
  }

  /**
   * Increment counter
   */

  async increment(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Redis INCR failed: ${error.message}`);

      return 0;
    }
  }

  /**
   * Direct Redis access
   * Use only for advanced cases
   */

  getClient() {
    return this.client;
  }
}
