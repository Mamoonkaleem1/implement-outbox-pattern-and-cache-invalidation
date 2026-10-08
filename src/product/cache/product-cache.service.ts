import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ProductCacheService {
  private readonly logger = new Logger(ProductCacheService.name);

  // 5 minutes
  private readonly PRODUCT_TTL = 60 * 5;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Cache Key
   */
  private productKey(userId: string, productId: string): string {
    return `product:${userId}:${productId}`;
  }

  /**
   * Get Product
   */
  async getProduct(userId: string, productId: string) {
    const key = this.productKey(userId, productId);

    const product = await this.redisService.get(key);

    if (product) {
      this.logger.log(`Cache HIT -> ${key}`);
    } else {
      this.logger.log(`Cache MISS -> ${key}`);
    }

    return product;
  }

  /**
   * Save Product
   */
  async setProduct(userId: string, product: any): Promise<void> {
    const key = this.productKey(userId, product.id);

    await this.redisService.set(key, product, this.PRODUCT_TTL);

    this.logger.log(`Cache SET -> ${key}`);
  }

  /**
   * Delete Product
   */
  async deleteProduct(userId: string, productId: string): Promise<void> {
    const key = this.productKey(userId, productId);

    await this.redisService.delete(key);

    this.logger.log(`Cache DELETE -> ${key}`);
  }
}
