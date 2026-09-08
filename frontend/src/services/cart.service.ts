import { CartItem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface CheckoutInput {
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items: CartItem[];
}

export async function processCheckout(input: CheckoutInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const lineItems = input.items.map(item => ({
    productId: item.product.id,
    quantity: item.quantity,
    price: item.product.price
  }));

  const res = await fetch(`${API_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: `${input.billing.first_name} ${input.billing.last_name}`,
      customerEmail: input.billing.email,
      customerPhone: input.billing.phone,
      items: lineItems
    })
  });

  if (!res.ok) {
    throw new Error('Error al procesar el checkout');
  }

  const json = await res.json();
  return {
    id: json.data.orderId,
    payment_url: `/foto/checkout-success?order_id=${json.data.orderId}`
  };
}