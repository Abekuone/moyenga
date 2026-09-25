export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}
