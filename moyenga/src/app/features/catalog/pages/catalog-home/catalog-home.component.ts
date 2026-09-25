import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import {
  ProductCardComponent,
  ProductCardData,
} from '../../../../shared/components/product-card/product-card.component';
import { Product } from '../../../../core/models/product.model';
import { PaginatedResponse } from '../../../../core/models/pagination.model';
import { ProductsService } from '../../../../core/services/products.service';

const EMPTY_RESPONSE: PaginatedResponse<Product> = {
  data: [],
  meta: { total: 0, page: 1, limit: 40, totalPages: 0 },
};

interface CategoryChip {
  id: string;
  slug: string;
  name: string;
}

@Component({
  standalone: true,
  selector: 'app-catalog-home',
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss',
})
export class CatalogHomeComponent {
  private readonly productsService = inject(ProductsService);

  // `undefined` = pas encore reçu, `null` = requête terminée (succès ou erreur avec fallback vide)
  private readonly response = toSignal(
    this.productsService.findAllPublic({ limit: 40 }).pipe(
      catchError((error) => {
        console.error('Erreur lors du chargement des produits', error);
        return of(EMPTY_RESPONSE);
      }),
    ),
    { initialValue: undefined },
  );

  readonly loading = computed(() => this.response() === undefined);

  readonly products = computed<ProductCardData[]>(() =>
    (this.response()?.data ?? []).map((product) => this.toCardData(product)),
  );

  // Catégories déduites des produits chargés - évite un appel réseau
  // supplémentaire tant qu'il n'y a pas de service de catégories branché ici.
  readonly categories = computed<CategoryChip[]>(() => {
    const seen = new Map<string, CategoryChip>();
    for (const product of this.response()?.data ?? []) {
      if (!seen.has(product.category.id)) {
        seen.set(product.category.id, {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.name,
        });
      }
    }
    return [...seen.values()];
  });

  onAddToCart(productId: string): void {
    // TODO: brancher sur CartService
    console.log('Ajout au panier', productId);
  }

  private toCardData(product: Product): ProductCardData {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.images[0]?.url,
      averageRating: product.averageRating,
      reviewsCount: product.reviewsCount,
      stock: product.stock,
    };
  }
}
