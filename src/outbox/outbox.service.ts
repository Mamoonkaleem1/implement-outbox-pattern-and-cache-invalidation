import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: any,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>,
  ) {
    return await tx.outboxEvent.create({
      data: {
        eventType,
        aggregateId,
        payload,
      },
    });
  }
}
