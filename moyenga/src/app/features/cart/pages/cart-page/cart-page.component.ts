import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CartItemView {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

// TODO: déplacer dans environment.ts (numéro WhatsApp de la boutique, au format international sans "+")
const WHATSAPP_NUMBER = '22670000000';

@Component({
  standalone: true,
  selector: 'app-cart-page',
  imports: [RouterLink],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPageComponent {
  // TODO: remplacer par CartService (état réel du panier)
  readonly items = signal<CartItemView[]>([]);

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  // Construit un message pré-rempli listant le panier, pour que le client
  // n'ait qu'à appuyer sur "Envoyer" dans WhatsApp.
  readonly whatsappLink = computed(() => {
    const lines = [
      'Bonjour, je souhaite commander :',
      '',
      ...this.items().map(
        (item) => `• ${item.name} - x${item.quantity} (${this.formatPrice(item.price * item.quantity)})`,
      ),
      '',
      `Total : ${this.formatPrice(this.total())}`,
    ];

    const message = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  });

  formatPrice(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value) + ' FCFA';
  }

  onIncrease(id: string): void {
    this.items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }

  onDecrease(id: string): void {
    this.items.update((items) =>
      items.map((i) => (i.id === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i)),
    );
  }

  onRemove(id: string): void {
    this.items.update((items) => items.filter((i) => i.id !== id));
  }
}