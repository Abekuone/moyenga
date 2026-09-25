import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';
import { PaginationDto } from '../../../common/dtos/pagination.dto.js';
import { UpdateCategoryDto } from '../dtos/update-category.dto.js';
import { slugify } from '../../../common/utils/slugify.util.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.assertCategoryExists(dto.parentId);
    }

    const slug = slugify(dto.slug ?? dto.name);
    await this.assertSlugAvailable(slug);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        image: dto.image,
        isActive: dto.isActive ?? true,
        parentId: dto.parentId,
      },
      include: this.defaultInclude(),
    });
  }

  // onlyRoot=true (par défaut côté boutique) : ne renvoie que les catégories
  // principales, chacune avec ses sous-catégories directes incluses.
  // onlyRoot=false (backoffice) : renvoie tout, à plat.
  async findAll(pagination: PaginationDto, onlyRoot = true) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(pagination.search
        ? { name: { contains: pagination.search, mode: 'insensitive' as const } }
        : {}),
      ...(onlyRoot ? { parentId: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: this.defaultInclude(),
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: this.defaultInclude(),
    });

    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Catégorie introuvable');

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Une catégorie ne peut pas être sa propre sous-catégorie');
      }
      await this.assertCategoryExists(dto.parentId);
      await this.assertNotDescendant(id, dto.parentId);
    }

    let slug: string | undefined;
    if (dto.slug || dto.name) {
      slug = slugify(dto.slug ?? dto.name!);
      await this.assertSlugAvailable(slug, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        image: dto.image,
        isActive: dto.isActive,
        parentId: dto.parentId,
      },
      include: this.defaultInclude(),
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!category) throw new NotFoundException('Catégorie introuvable');

    if (category._count.products > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une catégorie contenant des produits',
      );
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une catégorie contenant des sous-catégories - supprime ou déplace-les d\'abord',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Catégorie supprimée' };
  }

  private defaultInclude() {
    return {
      children: { orderBy: { name: 'asc' as const } },
      _count: { select: { products: true } },
    };
  }

  private async assertCategoryExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new BadRequestException('Catégorie parente introuvable');
  }

  // Empêche de créer un cycle (ex: mettre une catégorie comme sous-catégorie
  // de l'une de ses propres descendantes).
  private async assertNotDescendant(categoryId: string, candidateParentId: string) {
    let currentId: string | null = candidateParentId;
    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Ce parent créerait une boucle dans la hiérarchie des catégories',
        );
      }
      const current: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = current?.parentId ?? null;
    }
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ce slug est déjà utilisé par une autre catégorie');
    }
  }
}