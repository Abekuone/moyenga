import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import {
  ProductCardComponent,
  ProductCardData,
} from '../../../../shared/components/product-card/product-card.component';
import { PaginatedResponse } from '../../../../core/models/pagination.model';
import { Product, ProductFilter } from '../../../../core/models/product.model';
import { ProductsService } from '../../../../core/services/products.service';
import { CartService } from '../../../../core/services/cart.service';

const EMPTY_RESPONSE: PaginatedResponse<Product> = {
  data: [],
  meta: { total: 0, page: 1, limit: 40, totalPages: 0 },
};

@Component({
  standalone: true,
  selector: 'app-catalog-home',
  imports: [ProductCardComponent],
  templateUrl: './catalog-home.component.html',
  styleUrl: './catalog-home.component.scss',
})
export class CatalogHomeComponent {
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Recharge le catalogue à chaque changement de "search" ou "categoryId" dans l'URL
  private readonly response = toSignal(
    this.route.queryParamMap.pipe(
      switchMap((params) => {
        const filter: ProductFilter = { limit: 40 };
        const search = params.get('search');
        const categoryId = params.get('categoryId');
        if (search) filter.search = search;
        if (categoryId) filter.categoryId = categoryId;

        return this.productsService.findAllPublic(filter).pipe(
          catchError((error) => {
            console.error('Erreur lors du chargement des produits', error);
            return of(EMPTY_RESPONSE);
          }),
        );
      }),
    ),
    { initialValue: undefined },
  );

  readonly loading = computed(() => this.response() === undefined);

  readonly products = computed<ProductCardData[]>(() =>
    (this.response()?.data ?? []).map((product) => this.toCardData(product)),
  );

  // Petit résumé des filtres actifs, pour donner un retour visuel sur la recherche/catégorie
  readonly searchTerm = toSignal(
    this.route.queryParamMap.pipe(switchMap((params) => of(params.get('search')))),
    { initialValue: null },
  );

  readonly activeCategoryName = computed(
    () => this.response()?.data?.[0]?.category?.name ?? null,
  );

  readonly hasActiveFilters = computed(
    () => !!this.searchTerm() || !!this.route.snapshot.queryParamMap.get('categoryId'),
  );

  resetFilters(): void {
    this.router.navigate(['/']);
  }

  onAddToCart(product: ProductCardData): void {
    this.cartService.addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
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
