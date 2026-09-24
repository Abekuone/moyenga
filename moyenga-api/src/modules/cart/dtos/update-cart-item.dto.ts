import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantity: number;
}