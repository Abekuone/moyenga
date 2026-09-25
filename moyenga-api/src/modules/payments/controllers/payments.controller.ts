import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service.js';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/dtos/current-user.decorator.js';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';

@Controller('orders/:orderId/payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(Role.CLIENT)
  @Post()
  initiate(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.initiate(userId, orderId, dto);
  }

  // Le détail du paiement est déjà exposé via GET /orders/:id (payment inclus)
  // - pas besoin d'un endpoint GET séparé ici.

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch('confirm')
  confirm(@Param('orderId') orderId: string) {
    return this.paymentsService.confirm(orderId);
  }

  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.GESTIONNAIRE)
  @Patch('fail')
  fail(@Param('orderId') orderId: string) {
    return this.paymentsService.fail(orderId);
  }
}
