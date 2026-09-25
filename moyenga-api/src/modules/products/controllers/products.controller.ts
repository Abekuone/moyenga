import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { ProductsService } from '../services/products.service.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { ProductFilterDto } from '../dtos/product-filter.dto.js';
import { CreateProductDto } from '../dtos/create-product.dto.js';
import { UpdateProductDto } from '../dtos/update-product.dto.js';
import { UpdateStockDto } from '../dtos/update-stock.dto.js';
import { AddProductImageDto } from '../dtos/add-product-image.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // -------- Public - catalogue boutique (produits actifs uniquement) --------

  @Public()
  @Get()
  findAllPublic(@Query() filter: ProductFilterDto) {
    return this.productsService.findAllPublic(filter);
  }

  @Public()
  @Get(':idOrSlug')
  findOnePublic(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOnePublic(idOrSlug);
  }

  // -------- Backoffice - tous les produits, y compris inactifs --------

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Get('admin/all')
  findAllAdmin(@Query() filter: ProductFilterDto) {
    return this.productsService.findAllAdmin(filter);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Get('admin/:idOrSlug')
  findOneAdmin(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.findOneAdmin(idOrSlug);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  // Suppression réservée ADMIN/SUPERADMIN - un GESTIONNAIRE désactive plutôt
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // -------- Stock --------

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.productsService.updateStock(id, dto);
  }

  // -------- Images --------

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Post(':id/images')
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) {
    return this.productsService.addImage(id, dto);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }
}
