import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module';
import { OutboxService } from './outbox.service';
import { OutboxPublisher } from './outbox.publisher';

@Module({
  imports: [QueueModule],

  providers: [OutboxService, OutboxPublisher],

  exports: [OutboxService],
})
export class OutboxModule {}
