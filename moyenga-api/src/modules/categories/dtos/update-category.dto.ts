// UpdateCategoryDto reste un PartialType(CreateCategoryDto) - parentId en hérite

import { PartialType } from "@nestjs/mapped-types";
import { CreateCategoryDto } from "./create-category.dto.js";

// automatiquement en tant que champ optionnel, aucun changement nécessaire là-dessus.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}