import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Email ou téléphone requis' })
  identifier: string;

  @IsString()
  @MinLength(1, { message: 'Mot de passe requis' })
  password: string;
}
