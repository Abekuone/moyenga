import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AddCartItemDto } from '../dtos/add-cart-item.dto.js';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto.js';
  
  @Injectable()
  export class CartService {
    constructor(private readonly prisma: PrismaService) {}
  
    async getCart(userId: string) {
      const cart = await this.getOrCreateCart(userId);
      return this.withTotal(cart);
    }
  
    async addItem(userId: string, dto: AddCartItemDto) {
      const cart = await this.getOrCreateCart(userId);
      const product = await this.assertProductExists(dto.productId);
  
      const existingItem = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
      });
  
      const newQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
      this.assertStockSufficient(product, newQuantity);
  
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
        update: { quantity: newQuantity },
        create: { cartId: cart.id, productId: dto.productId, quantity: dto.quantity },
      });
  
      return this.getCart(userId);
    }
  
    async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
      const cart = await this.getOrCreateCart(userId);
      const product = await this.assertProductExists(productId);
  
      const item = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      if (!item) throw new NotFoundException("Cet article n'est pas dans le panier");
  
      this.assertStockSufficient(product, dto.quantity);
  
      await this.prisma.cartItem.update({
        where: { cartId_productId: { cartId: cart.id, productId } },
        data: { quantity: dto.quantity },
      });
  
      return this.getCart(userId);
    }
  
    async removeItem(userId: string, productId: string) {
      const cart = await this.getOrCreateCart(userId);
  
      const item = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      if (!item) throw new NotFoundException("Cet article n'est pas dans le panier");
  
      await this.prisma.cartItem.delete({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
  
      return this.getCart(userId);
    }
  
    async clearCart(userId: string) {
      const cart = await this.getOrCreateCart(userId);
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { message: 'Panier vidé' };
    }
  
    // ---------------------------------------------------------------------
    // Utilisé aussi par OrdersService au moment du checkout
    // ---------------------------------------------------------------------
    async getOrCreateCart(userId: string) {
      let cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: this.defaultInclude(),
      });
  
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId },
          include: this.defaultInclude(),
        });
      }
  
      return cart;
    }
  
    // ---------------------------------------------------------------------
    private defaultInclude() {
      return {
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' as const } } },
            },
          },
        },
      };
    }
  
    private withTotal(cart: any) {
      const total = cart.items.reduce(
        (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
        0,
      );
      return { ...cart, total };
    }
  
    private async assertProductExists(productId: string) {
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) {
        throw new NotFoundException('Produit introuvable ou indisponible');
      }
      return product;
    }
  
    private assertStockSufficient(product: { stock: number; name: string }, quantity: number) {
      if (quantity > product.stock) {
        throw new BadRequestException(
          `Stock insuffisant pour "${product.name}" — ${product.stock} unité(s) disponible(s)`,
        );
      }
    }
  }