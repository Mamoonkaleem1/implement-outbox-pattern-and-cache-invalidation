import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductCacheService } from './cache/product-cache.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [AuthModule, RedisModule],
  providers: [ProductService, ProductCacheService],
  controllers: [ProductController],
  exports: [ProductCacheService],
})
export class ProductModule {}
