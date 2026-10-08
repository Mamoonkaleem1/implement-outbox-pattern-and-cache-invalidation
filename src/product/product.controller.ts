import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/gaurds/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateProductDto) {
    if (!req.user?.['id']) {
      throw new UnauthorizedException('User is not authenticated.');
    }
    return this.productService.create(req.user['id'], dto);
  }

  @Get()
  async findAll(@Req() req: Request) {
    Logger.log('req.user', req.user);
    if (!req.user?.['id']) {
      throw new UnauthorizedException('User is not authenticated.');
    }
    return this.productService.findAll(req.user['id']);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    if (!req.user?.['id']) {
      throw new UnauthorizedException('User is not authenticated.');
    }
    return this.productService.findOne(id, req.user['id']);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    if (!req.user?.['id']) {
      throw new UnauthorizedException('User is not authenticated.');
    }
    return this.productService.update(id, req.user['id'], dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    if (!req.user?.['id']) {
      throw new UnauthorizedException('User is not authenticated.');
    }
    return this.productService.remove(id, req.user['id']);
  }
}
