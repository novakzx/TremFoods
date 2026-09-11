import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Finalizar pedido',
  description: 'Finalize o seu pedido na Trem Food: entrega ao domicílio ou levantamento, pagamento em dinheiro, cartão, MB WAY ou Multibanco.',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
