import type { Metadata } from 'next';
import CheckoutSuccess from '@/components/gallery/CheckoutSuccess';

export const metadata: Metadata = {
  title: 'Pedido Recibido | Bearded Mountaineer',
};

export default function CheckoutSuccessPage() {
  return <CheckoutSuccess />;
}