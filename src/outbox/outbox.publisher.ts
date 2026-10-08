import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CacheQueueService } from '../queue/cache-queue.service';

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);

  private interval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheQueue: CacheQueueService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => {
      void this.publishEvents();
    }, 5000);

    this.logger.log('Outbox publisher started');
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async publishEvents() {
    try {
      // Recover events that got stuck because
      // the application crashed.
      await this.recoverStuckEvents();

      // Get and lock pending events.
      const events = await this.claimEvents();

      for (const event of events) {
        try {
          const payload = event.payload as {
            userId: string;
            productId: string;
          };

          // Send job to BullMQ.
          await this.cacheQueue.deleteProductCache(
            payload.userId,
            payload.productId,
            `outbox-${event.id}`,
          );

          // Successfully sent to BullMQ.
          await this.prisma.outboxEvent.update({
            where: {
              id: event.id,
            },
            data: {
              status: 'PROCESSED',
              processedAt: new Date(),
            },
          });

          this.logger.log(`Outbox event ${event.id} processed`);
        } catch (error) {
          // Something went wrong while publishing.
          // Try again on the next polling cycle.
          await this.prisma.outboxEvent.update({
            where: {
              id: event.id,
            },
            data: {
              status: 'PENDING',
              lastError: error instanceof Error ? error.message : String(error),
            },
          });

          this.logger.error(
            `Failed to process outbox event ${event.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Outbox publisher failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get pending events and mark them as PROCESSING.
   *
   * FOR UPDATE SKIP LOCKED prevents multiple
   * application instances from taking the same event.
   */
  private async claimEvents() {
    return this.prisma.$transaction(async (tx) => {
      const events = await tx.$queryRaw<
        {
          id: string;
          eventType: string;
          aggregateId: string;
          payload: unknown;
        }[]
      >`
        SELECT
          "id",
          "eventType",
          "aggregateId",
          "payload"
        FROM "OutboxEvent"
        WHERE "status" = 'PENDING'
        ORDER BY "createdAt" ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      `;

      if (events.length === 0) {
        return [];
      }

      await tx.outboxEvent.updateMany({
        where: {
          id: {
            in: events.map((event) => event.id),
          },
        },
        data: {
          status: 'PROCESSING',
          attempts: {
            increment: 1,
          },
        },
      });

      return events;
    });
  }

  /**
   * If the application crashes while an event
   * is PROCESSING, move it back to PENDING.
   */
  private async recoverStuckEvents() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: {
          lt: fiveMinutesAgo,
        },
      },
      data: {
        status: 'PENDING',
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Recovered ${result.count} stuck events`);
    }
  }
}
