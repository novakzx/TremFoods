import type { Metadata } from 'next';
import { MenuBrowser } from '@/components/menu-browser';
import { listMenuProducts } from '@/domains/menu/catalog';

export const metadata: Metadata = {
  title: 'Cardápio',
  description:
    'Cardápio da Trem Food: hambúrgueres artesanais, combos, petiscos, pratos, hot dogs, sobremesas e bebidas. Pesquise e peça online.',
  alternates: { canonical: 'https://tremfood.pt/cardapio' },
  openGraph: { url: 'https://tremfood.pt/cardapio', title: 'Cardápio · Trem Food' },
};

export default async function CardapioPage() {
  const products = await listMenuProducts();

  return (
    <div className="container-app py-6 sm:py-8">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Cardápio</h1>
        <p className="mt-1 text-sm text-muted">Pedidos online todos os dias, das 06h30 às 00h00.</p>
      </header>
      <MenuBrowser products={products} />
    </div>
  );
}
