import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../../prisma/prisma-client.js';

export class CreateStaffDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Numéro de téléphone invalide',
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

  @IsEnum([Role.ADMIN, Role.GESTIONNAIRE], {
    message: 'Le rôle doit être ADMIN ou GESTIONNAIRE',
  })
  role: Role;
}
