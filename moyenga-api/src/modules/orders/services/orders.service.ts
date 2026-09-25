import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CartService } from '../../cart/services/cart.service.js';
import { CreateOrderDto } from '../dtos/create-order.dto.js';
import { OrderFilterDto } from '../dtos/order-filter.dto.js';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto.js';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  // ---------------------------------------------------------------------
  // Création - transforme le panier courant en commande (transaction)
  // ---------------------------------------------------------------------
  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.cartService.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    return this.prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      // Revérifie stock + prix en base au moment du checkout (le panier peut être obsolète)
      for (const item of cart.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Le produit "${item.product.name}" n'est plus disponible`,
          );
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour "${product.name}" - ${product.stock} unité(s) disponible(s)`,
          );
        }

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
        total += Number(product.price) * item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const order = await tx.order.create({
        data: {
          userId,
          total,
          shippingAddress: dto.shippingAddress,
          shippingPhone: dto.shippingPhone,
          notes: dto.notes,
          items: { createMany: { data: orderItemsData } },
        },
        include: this.defaultInclude(),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order;
    });
  }

  // ---------------------------------------------------------------------
  // Lecture / actions - CLIENT (ses propres commandes uniquement)
  // ---------------------------------------------------------------------
  async findAllForUser(userId: string, filter: OrderFilterDto) {
    return this.findAll({ ...filter, userId });
  }

  async findOneForUser(userId: string, id: string) {
    const order = await this.getById(id);
    if (order.userId !== userId) {
      throw new ForbiddenException('Cette commande ne vous appartient pas');
    }
    return order;
  }

  async cancelOwnOrder(userId: string, id: string) {
    const order = await this.getById(id);
    if (order.userId !== userId) {
      throw new ForbiddenException('Cette commande ne vous appartient pas');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Seule une commande en attente (PENDING) peut être annulée par le client',
      );
    }
    return this.setStatus(id, OrderStatus.CANCELLED);
  }

  // ---------------------------------------------------------------------
  // Lecture / gestion - backoffice
  // ---------------------------------------------------------------------
  async findAllAdmin(filter: OrderFilterDto) {
    return this.findAll(filter);
  }

  async findOneAdmin(id: string) {
    return this.getById(id);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.getById(id);

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition invalide : ${order.status} → ${dto.status}`);
    }

    return this.setStatus(id, dto.status);
  }

  // ---------------------------------------------------------------------
  // Helpers privés
  // ---------------------------------------------------------------------
  private async setStatus(id: string, status: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) throw new NotFoundException('Commande introuvable');

      // Une annulation restitue le stock réservé
      if (status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status },
        include: this.defaultInclude(),
      });
    });
  }

  private async findAll(filter: OrderFilterDto & { userId?: string }) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  private async getById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  private defaultInclude() {
    return {
      items: { include: { product: { select: { id: true, name: true, slug: true } } } },
      payment: true,
      user: {
        select: { id: true, email: true, phone: true, firstName: true, lastName: true },
      },
    };
  }
}
