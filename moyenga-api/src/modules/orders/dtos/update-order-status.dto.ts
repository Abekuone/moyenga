import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../prisma/prisma-client.js';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}