import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { ProductDetailComponent } from '../../../../shared/components/product-detail/product-detail.component';
import {
  ProductCardComponent,
  ProductCardData,
} from '../../../../shared/components/product-card/product-card.component';
import { Product } from '../../../../core/models/product.model';
import { ProductsService } from '../../../../core/services/products.service';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  standalone: true,
  selector: 'app-product-detail-page',
  imports: [ProductDetailComponent, ProductCardComponent, RouterLink],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
})
export class ProductDetailPageComponent {
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly response = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const idOrSlug = params.get('slug');
        if (!idOrSlug) return of(null);
        return this.productsService.findOnePublic(idOrSlug).pipe(
          catchError((error) => {
            console.error('Erreur lors du chargement du produit', error);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: undefined },
  );

  readonly loading = computed(() => this.response() === undefined);
  readonly product = computed<Product | null>(() => this.response() ?? null);
  readonly notFound = computed(() => !this.loading() && this.product() === null);

  // TODO: brancher un vrai FavoritesService quand il existera côté backend
  readonly isFavorite = computed(() => false);

  private readonly similarResponse = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const idOrSlug = params.get('slug');
        if (!idOrSlug) return of(null);
        return this.productsService.findOnePublic(idOrSlug).pipe(
          switchMap((product) => {
            if (!product.category) return of({ data: [] });
            return this.productsService.findAllPublic({
              categoryId: product.category.id,
              limit: 5,
            });
          }),
          catchError(() => of({ data: [] })),
        );
      }),
    ),
    { initialValue: undefined },
  );

  readonly similarProducts = computed<ProductCardData[]>(() => {
    const current = this.product();
    return (this.similarResponse()?.data ?? [])
      .filter((p) => p.id !== current?.id)
      .slice(0, 4)
      .map((p) => this.toCardData(p));
  });

  onAddToCart(event: { product: Product; quantity: number }): void {
    this.cartService.addItem({
      productId: event.product.id,
      slug: event.product.slug,
      name: event.product.name,
      price: event.product.price,
      imageUrl: event.product.images?.[0]?.url,
      // quantity: event.quantity,
    });
  }

  onToggleFavorite(product: Product): void {
    // TODO: appeler FavoritesService une fois disponible côté API
    console.log('toggle favorite', product.id);
  }

  onShare(product: Product): void {
    const url = `${location.origin}/produits/${product.slug}`;
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  onAddSimilarToCart(product: ProductCardData): void {
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
      imageUrl: product.images?.[0]?.url,
      averageRating: product.averageRating,
      reviewsCount: product.reviewsCount,
      stock: product.stock,
    };
  }
}