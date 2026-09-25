export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  parentId?: string | null;
  // Présent uniquement sur les catégories racines (retour de GET /categories)
  children?: Category[];
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

// Forme brute renvoyée par l'API : Prisma sérialise les Decimal en string
export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string;
  stock: number;
  isActive: boolean;
  categoryId: string;
  category: Category;
  images: ProductImage[];
  reviewsCount: number;
  averageRating: number | null;
  createdAt: string;
  updatedAt: string;
}

// Forme utilisée côté frontend : price est un number exploitable directement
export interface Product extends Omit<ApiProduct, 'price'> {
  price: number;
}

// Filtres correspondant à ProductFilterDto côté backend
export interface ProductFilter {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: string;
  isActive?: boolean;
  images?: string[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface UpdateStockPayload {
  operation: 'increment' | 'decrement' | 'set';
  quantity: number;
}

export interface AddProductImagePayload {
  url: string;
  position?: number;
}
