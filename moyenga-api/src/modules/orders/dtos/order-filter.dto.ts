import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';
import { OrderStatus } from '../../prisma/prisma-client.js';

export class OrderFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}