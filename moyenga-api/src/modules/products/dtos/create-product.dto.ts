import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(150)
  name: string;

  // Optionnel - généré automatiquement à partir du nom si absent
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Le prix doit être un nombre avec 2 décimales maximum' },
  )
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  price: number;

  @IsInt()
  @Min(0, { message: 'Le stock ne peut pas être négatif' })
  stock: number;

  @IsUUID('4', { message: 'categoryId doit être un UUID valide' })
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // URLs d'images déjà hébergées (le module upload viendra brancher un vrai stockage)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maximum 10 images par produit' })
  @IsUrl({}, { each: true, message: 'Chaque image doit être une URL valide' })
  images?: string[];
}
