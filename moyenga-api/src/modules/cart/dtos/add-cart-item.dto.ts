import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID('4', { message: 'productId doit être un UUID valide' })
  productId: string;

  @IsInt()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantity: number;
}
