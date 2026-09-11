import type { Metadata } from 'next';
import { CartClient } from './cart-client';

export const metadata: Metadata = {
  title: 'Carrinho',
  description: 'O seu carrinho na Trem Food. Ajuste quantidades e finalize o pedido com entrega ao domicílio ou levantamento na loja.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-app py-8 sm:py-10">
      <CartClient />
    </div>
  );
}
