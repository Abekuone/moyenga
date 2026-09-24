import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module.js';
import { OrdersController } from './controllers/orders.controller.js';
import { OrdersService } from './services/orders.service.js';

@Module({
  imports: [CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
