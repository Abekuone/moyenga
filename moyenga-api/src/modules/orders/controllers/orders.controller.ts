import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { OrdersService } from '../services/orders.service.js';
import { CreateOrderDto } from '../dtos/create-order.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/dtos/current-user.decorator.js';
import { OrderFilterDto } from '../dtos/order-filter.dto.js';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.CLIENT)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Roles(Role.CLIENT)
  @Get()
  findMine(@CurrentUser('id') userId: string, @Query() filter: OrderFilterDto) {
    return this.ordersService.findAllForUser(userId, filter);
  }

  @Roles(Role.CLIENT)
  @Get(':id')
  findOneMine(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findOneForUser(userId, id);
  }

  @Roles(Role.CLIENT)
  @Patch(':id/cancel')
  cancelMine(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ordersService.cancelOwnOrder(userId, id);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Get('admin/all')
  findAllAdmin(@Query() filter: OrderFilterDto) {
    return this.ordersService.findAllAdmin(filter);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
