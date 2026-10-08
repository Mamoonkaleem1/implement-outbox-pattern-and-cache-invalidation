import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { CACHE_QUEUE, DELETE_PRODUCT_CACHE_JOB } from './queue.constants';

@Injectable()
export class CacheQueueService {
  constructor(
    @InjectQueue(CACHE_QUEUE)
    private readonly cacheQueue: Queue,
  ) {}

  async deleteProductCache(userId: string, productId: string, jobId: string) {
    await this.cacheQueue.add(
      DELETE_PRODUCT_CACHE_JOB,
      {
        userId,
        productId,
      },
      {
        jobId,

        attempts: 5,

        backoff: {
          type: 'exponential',
          delay: 2000,
        },

        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
