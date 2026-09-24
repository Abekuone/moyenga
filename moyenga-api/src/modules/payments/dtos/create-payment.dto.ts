import { IsEnum } from 'class-validator';

export enum PaymentProvider {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ORANGE_MONEY = 'ORANGE_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
}

export class CreatePaymentDto {
  @IsEnum(PaymentProvider, { message: 'Fournisseur de paiement invalide' })
  provider: PaymentProvider;
}
