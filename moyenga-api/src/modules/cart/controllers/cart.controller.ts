import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma/prisma-client.js';
import { CartService } from '../services/cart.service.js';
import { CurrentUser } from '../../auth/dtos/current-user.decorator.js';
import { AddCartItemDto } from '../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto.js';


@Roles(Role.CLIENT)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:productId')
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, productId, dto);
  }

  @Delete('items/:productId')
  removeItem(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete()
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}