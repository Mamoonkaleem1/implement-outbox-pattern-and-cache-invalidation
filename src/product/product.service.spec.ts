import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCacheService } from './cache/product-cache.service';

describe('ProductService', () => {
  let service: ProductService;
  let prismaService: {
    $transaction: jest.Mock;
    product: { update: jest.Mock; delete: jest.Mock };
    outboxEvent: { create: jest.Mock };
  };
  let productCache: { deleteProduct: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn(async (cb) =>
        cb({
          product: {
            update: jest.fn().mockResolvedValue({ id: 'p1' }),
            delete: jest.fn().mockResolvedValue({ id: 'p1' }),
          },
          outboxEvent: {
            create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
          },
        }),
      ),
      product: {
        update: jest.fn(),
        delete: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
    };

    productCache = {
      deleteProduct: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ProductCacheService, useValue: productCache },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('invalidates cache immediately after updating a product', async () => {
    await service.update('p1', 'u1', { name: 'Updated' });

    expect(productCache.deleteProduct).toHaveBeenCalledWith('u1', 'p1');
  });

  it('invalidates cache immediately after deleting a product', async () => {
    await service.remove('p1', 'u1');

    expect(productCache.deleteProduct).toHaveBeenCalledWith('u1', 'p1');
  });
});
