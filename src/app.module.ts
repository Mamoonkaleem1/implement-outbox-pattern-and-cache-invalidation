import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { ProductModule } from './product/product.module';
import { QueueModule } from './queue/queue.module';
import { OutboxModule } from './outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),

    AuthModule,
    UsersModule,
    SessionsModule,
    PrismaModule,
    HealthModule,
    RedisModule,
    ProductModule,
    QueueModule,
    OutboxModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
