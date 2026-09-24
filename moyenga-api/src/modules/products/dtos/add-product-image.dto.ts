import { IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class AddProductImageDto {
  @IsUrl({}, { message: "URL d'image invalide" })
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
