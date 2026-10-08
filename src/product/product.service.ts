import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCacheService } from './cache/product-cache.service';
import { use } from 'passport';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly productCache: ProductCacheService,
  ) {}
  async create(userId: string, dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          ...dto,
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Product with this SKU already exists.');
      }

      throw error;
    }
  }
  async findAll(userId: any) {
    try {
      return await this.prisma.product.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.logger.log('err in finding products...', error.message);
      throw error;
    }
  }
  async findOne(id: string, userId: string) {
    //firstly check the cache...
    const cacheProduct = await this.productCache.getProduct(userId, id);
    if (cacheProduct) {
      return cacheProduct;
    }
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    //setting to cache......
    await this.productCache.setProduct(userId, product);
    return product;
  }

  async update(id: string, userId: string, dto: UpdateProductDto) {
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        // 1. Update product
        const updatedProduct = await tx.product.update({
          where: {
            userId_id: {
              userId,
              id,
            },
          },
          data: dto,
        });

        // 2. Create outbox event
        await tx.outboxEvent.create({
          data: {
            eventType: 'PRODUCT_CACHE_INVALIDATION',

            aggregateId: id,

            payload: {
              userId,
              productId: id,
            },
          },
        });

        return updatedProduct;
      });

      // Fire-and-forget invalidation so the request is not blocked on Redis.
      void this.productCache.deleteProduct(userId, id);

      return product;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found.');
        }

        if (error.code === 'P2002') {
          throw new ConflictException('Product with this SKU already exists.');
        }
      }

      throw error;
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete product
        await tx.product.delete({
          where: {
            userId_id: {
              userId,
              id,
            },
          },
        });

        // 2. Create outbox event
        await tx.outboxEvent.create({
          data: {
            eventType: 'PRODUCT_CACHE_INVALIDATION',

            aggregateId: id,

            payload: {
              userId,
              productId: id,
            },
          },
        });
      });

      // Fire-and-forget invalidation so stale cache never serves deleted item.
      void this.productCache.deleteProduct(userId, id);

      return {
        message: 'Product deleted successfully.',
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Product not found.');
        }
      }

      throw error;
    }
  }
}
