import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

import { CACHE_QUEUE, DELETE_PRODUCT_CACHE_JOB } from './queue.constants';
import { ProductCacheService } from 'src/product/cache/product-cache.service';

@Processor(CACHE_QUEUE)
export class CacheProcessor extends WorkerHost {
  private readonly logger = new Logger(CacheProcessor.name);

  constructor(private readonly productCache: ProductCacheService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case DELETE_PRODUCT_CACHE_JOB:
        await this.deleteProductCache(job);
        break;

      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private async deleteProductCache(
    job: Job<{
      userId: string;
      productId: string;
    }>,
  ) {
    const { userId, productId } = job.data;

    await this.productCache.deleteProduct(userId, productId);

    this.logger.log(`Cache deleted for product ${productId}`);
  }
}
