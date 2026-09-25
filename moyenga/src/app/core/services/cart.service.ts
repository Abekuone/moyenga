import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart.model';

const STORAGE_KEY = 'moyenga_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(this.readFromStorage());

  readonly items = this.itemsSignal.asReadonly();

  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly total = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  addItem(product: Omit<CartItem, 'quantity'>, quantity = 1): void {
    this.itemsSignal.update((items) => {
      const existing = items.find((i) => i.productId === product.productId);
      if (existing) {
        return items.map((i) =>
          i.productId === product.productId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...items, { ...product, quantity }];
    });
    this.persist();
  }

  increase(productId: string): void {
    this.itemsSignal.update((items) =>
      items.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)),
    );
    this.persist();
  }

  decrease(productId: string): void {
    this.itemsSignal.update((items) =>
      items.map((i) =>
        i.productId === productId && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i,
      ),
    );
    this.persist();
  }

  remove(productId: string): void {
    this.itemsSignal.update((items) => items.filter((i) => i.productId !== productId));
    this.persist();
  }

  clear(): void {
    this.itemsSignal.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      //
    }
  }

  private readFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
