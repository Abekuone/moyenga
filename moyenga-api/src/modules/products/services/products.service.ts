import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { slugify } from '../../../common/utils/slugify.util.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProductDto } from '../dtos/create-product.dto.js';
import { UpdateProductDto } from '../dtos/update-product.dto.js';
import { UpdateStockDto } from '../dtos/update-stock.dto.js';
import { AddProductImageDto } from '../dtos/add-product-image.dto.js';
import { ProductFilterDto } from '../dtos/product-filter.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  // ---------------------------------------------------------------------
  // Création
  // ---------------------------------------------------------------------
  async create(dto: CreateProductDto) {
    await this.assertCategoryExists(dto.categoryId);

    const slug = slugify(dto.slug ?? dto.name);
    await this.assertSlugAvailable(slug);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isActive: dto.isActive ?? true,
        images: dto.images?.length
          ? { create: dto.images.map((url, index) => ({ url, position: index })) }
          : undefined,
      },
      include: this.defaultInclude(),
    });

    return this.withRating(product);
  }

  // ---------------------------------------------------------------------
  // Lecture - catalogue public (produits actifs uniquement)
  // ---------------------------------------------------------------------
  async findAllPublic(filter: ProductFilterDto) {
    return this.findAll({ ...filter, isActive: true });
  }

  async findOnePublic(idOrSlug: string) {
    const product = await this.getByIdOrSlug(idOrSlug);
    if (!product.isActive) {
      throw new NotFoundException('Produit introuvable');
    }
    return this.withRating(product);
  }

  // ---------------------------------------------------------------------
  // Lecture - backoffice (tous les produits, filtre isActive optionnel)
  // ---------------------------------------------------------------------
  async findAllAdmin(filter: ProductFilterDto) {
    return this.findAll(filter);
  }

  async findOneAdmin(idOrSlug: string) {
    const product = await this.getByIdOrSlug(idOrSlug);
    return this.withRating(product);
  }

  // ---------------------------------------------------------------------
  // Mise à jour
  // ---------------------------------------------------------------------
  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit introuvable');

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    let slug: string | undefined;
    if (dto.slug || dto.name) {
      slug = slugify(dto.slug ?? dto.name!);
      await this.assertSlugAvailable(slug, id);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      include: this.defaultInclude(),
    });

    return this.withRating(product);
  }

  // ---------------------------------------------------------------------
  // Suppression - bloquée si le produit a déjà des commandes
  // ---------------------------------------------------------------------
  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!product) throw new NotFoundException('Produit introuvable');

    if (product._count.orderItems > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un produit ayant déjà des commandes - désactive-le plutôt (isActive: false)',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Produit supprimé' };
  }

  // ---------------------------------------------------------------------
  // Gestion du stock
  // ---------------------------------------------------------------------
  async updateStock(id: string, dto: UpdateStockDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable');

    let newStock: number;
    if (dto.operation === 'increment') {
      newStock = product.stock + dto.quantity;
    } else if (dto.operation === 'decrement') {
      newStock = product.stock - dto.quantity;
      if (newStock < 0) {
        throw new BadRequestException('Stock insuffisant pour cette opération');
      }
    } else {
      newStock = dto.quantity;
    }

    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });
  }

  // ---------------------------------------------------------------------
  // Gestion des images
  // ---------------------------------------------------------------------
  async addImage(productId: string, dto: AddProductImageDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const position = dto.position ?? product.images.length;

    return this.prisma.productImage.create({
      data: { productId, url: dto.url, position },
    });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image introuvable pour ce produit');

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image supprimée' };
  }

  // ---------------------------------------------------------------------
  // Helpers privés
  // ---------------------------------------------------------------------
  // --- Dans findAll(), remplace la construction du "where" par ceci : ---

  private async findAll(filter: ProductFilterDto) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const categoryIds = filter.categoryId
      ? await this.resolveCategoryIds(filter.categoryId)
      : undefined;

    const where: Prisma.ProductWhereInput = {
      ...(filter.search
        ? { name: { contains: filter.search, mode: 'insensitive' } }
        : {}),
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
        ? {
          price: {
            ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
            ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
          },
        }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => this.withRating(p)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- Nouveau helper à ajouter parmi les méthodes privées : ---

  // Si categoryId est une catégorie principale, on inclut aussi ses
  // sous-catégories pour que le filtre remonte bien tous les produits.
  // Si c'est déjà une sous-catégorie (ou une catégorie sans enfants), on
  // filtre juste dessus.
  private async resolveCategoryIds(categoryId: string): Promise<string[]> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: { select: { id: true } } },
    });

    if (!category) return [categoryId];

    return category.children.length
      ? [category.id, ...category.children.map((c) => c.id)]
      : [category.id];
  }

  private async getByIdOrSlug(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: this.defaultInclude(),
    });

    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  private defaultInclude() {
    return {
      category: true,
      images: { orderBy: { position: 'asc' as const } },
      reviews: { select: { rating: true } },
    };
  }

  // Calcule la note moyenne et le nombre d'avis, retire le tableau brut des reviews
  private withRating<T extends { reviews: { rating: number }[] }>(product: T) {
    const { reviews, ...rest } = product as any;
    const reviewsCount = reviews.length;
    const averageRating =
      reviewsCount > 0
        ? Math.round(
          (reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
            reviewsCount) *
          10,
        ) / 10
        : null;

    return { ...rest, reviewsCount, averageRating };
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Catégorie introuvable');
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ce slug est déjà utilisé par un autre produit');
    }
  }
}
