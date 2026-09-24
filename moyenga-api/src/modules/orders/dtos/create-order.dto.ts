import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddress?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Numéro de téléphone invalide' })
  shippingPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}