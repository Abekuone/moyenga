import { Component, computed, input, output, signal } from '@angular/core';
import { Product } from '../../../core/models/product.model';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent {
  readonly product = input<Product | null>(null);
  readonly isFavorite = input<boolean>(false);

  readonly addToCart = output<{ product: Product; quantity: number }>();
  readonly toggleFavorite = output<Product>();
  readonly share = output<Product>();

  readonly selectedImageIndex = signal(0);
  readonly quantity = signal(1);

  readonly images = computed(() => this.product()?.images ?? []);
  readonly activeImage = computed(() => this.images()[this.selectedImageIndex()]);

  readonly inStock = computed(() => (this.product()?.stock ?? 0) > 0);
  readonly lowStock = computed(() => {
    const s = this.product()?.stock ?? 0;
    return s > 0 && s <= 5;
  });

  readonly maxQuantity = computed(() => Math.max(this.product()?.stock ?? 0, 0));

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  decrementQuantity(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  incrementQuantity(): void {
    this.quantity.update((q) => Math.min(this.maxQuantity() || 1, q + 1));
  }

  onAddToCart(): void {
    const product = this.product();
    if (!product || !this.inStock()) return;
    this.addToCart.emit({ product, quantity: this.quantity() });
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }
}