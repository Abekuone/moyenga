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
import { CategoriesService } from '../services/categories.service.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // -------- Public - consultation depuis la boutique --------

  @Public()
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.categoriesService.findAll(pagination);
  }

  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.categoriesService.findOne(idOrSlug);
  }

  // -------- Backoffice - ADMIN / SUPERADMIN / GESTIONNAIRE --------

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  // -------- Suppression - ADMIN / SUPERADMIN uniquement --------

  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
