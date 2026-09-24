import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ProductCardComponent,
  ProductCardData,
} from '../../../../shared/components/product-card/product-card.component';

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
  // TODO: remplacer par CategoriesService / ProductsService (findAllPublic)
  readonly categories = signal<CategoryChip[]>([]);
  readonly products = signal<ProductCardData[]>([]);

  onAddToCart(productId: string): void {
    // TODO: brancher sur CartService
    console.log('Ajout au panier', productId);
  }
}
