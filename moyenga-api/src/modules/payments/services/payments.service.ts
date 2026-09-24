import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(userId: string, orderId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.userId !== userId) {
      throw new ForbiddenException('Cette commande ne vous appartient pas');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Impossible de payer une commande annulée');
    }
    if (order.payment) {
      throw new ConflictException('Un paiement existe déjà pour cette commande');
    }

    // TODO: brancher un vrai provider (Orange Money, Moov Money, carte...).
    // Pour l'instant on crée juste l'enregistrement en attente ; la confirmation
    // se fait manuellement côté backoffice (ou via webhook une fois le provider branché).
    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: dto.provider,
        amount: order.total,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async confirm(orderId: string) {
    const payment = await this.getForOrder(orderId);

    if (payment.status === PaymentStatus.SUCCESS) {
      throw new ConflictException('Ce paiement est déjà confirmé');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.SUCCESS },
      });

      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (order?.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CONFIRMED },
        });
      }

      return updated;
    });
  }

  async fail(orderId: string) {
    const payment = await this.getForOrder(orderId);

    if (payment.status === PaymentStatus.SUCCESS) {
      throw new ConflictException(
        'Ce paiement est déjà confirmé, impossible de le marquer en échec',
      );
    }

    return this.prisma.payment.update({
      where: { orderId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  private async getForOrder(orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new NotFoundException('Aucun paiement pour cette commande');
    return payment;
  }
}
