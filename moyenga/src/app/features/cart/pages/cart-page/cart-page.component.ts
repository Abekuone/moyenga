import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';

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
  private readonly cartService = inject(CartService);

  readonly items = this.cartService.items;
  readonly total = this.cartService.total;

  // Construit un message pré-rempli listant le panier, pour que le client
  // n'ait qu'à appuyer sur "Envoyer" dans WhatsApp.
  readonly whatsappLink = computed(() => {
    const lines = [
      'Bonjour, je souhaite commander :',
      '',
      ...this.items().map(
        (item) => `• ${item.name} — x${item.quantity} (${this.formatPrice(item.price * item.quantity)})`,
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

  onIncrease(productId: string): void {
    this.cartService.increase(productId);
  }

  onDecrease(productId: string): void {
    this.cartService.decrease(productId);
  }

  onRemove(productId: string): void {
    this.cartService.remove(productId);
  }
}
