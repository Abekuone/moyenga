import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Numéro de téléphone invalide (format international recommandé, ex: +22670000000)',
  })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
