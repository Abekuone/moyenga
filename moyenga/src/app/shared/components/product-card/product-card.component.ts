import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  averageRating?: number | null;
  reviewsCount?: number;
  stock: number;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  readonly product = input.required<ProductCardData>();
  readonly addToCart = output<ProductCardData>();

  formatPrice(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }
}
