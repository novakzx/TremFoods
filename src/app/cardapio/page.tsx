import type { Metadata } from 'next';
import { MenuBrowser, type ProductView } from '@/components/menu-browser';
import { prisma } from '@/infra/db';

export const metadata: Metadata = {
  title: 'Cardápio',
  description:
    'Cardápio da Trem Food: hambúrgueres artesanais, opções vegetarianas, batatas rústicas, onion rings, milkshakes e bebidas. Pesquise e adicione ao carrinho.',
  alternates: { canonical: 'https://tremfood.pt/cardapio' },
  openGraph: { url: 'https://tremfood.pt/cardapio', title: 'Cardápio · Trem Food' },
};

export default async function CardapioPage() {
  let products: ProductView[] = [];
  try {
    const rows = await prisma.product.findMany({
      where: { available: true },
      include: { category: { select: { id: true, name: true, slug: true, sort: true } }, _count: { select: { optionGroups: true } } },
      orderBy: { sort: 'asc' },
    });
    products = [...rows]
      .sort((a, b) => (a.category?.sort ?? 0) - (b.category?.sort ?? 0))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description ?? '',
        priceCents: p.priceCents,
        image: p.image,
        available: p.available,
        isFeatured: p.isFeatured,
        isNew: p.isNew,
        isVegetarian: p.isVegetarian,
        isSpicy: p.isSpicy,
        category: p.category,
        categoryId: p.categoryId,
        hasOptions: (p._count?.optionGroups ?? 0) > 0,
      }));
  } catch (error) {
    console.error('[CardapioPage] Error loading products:', error);
    products = [];
  }

  return (
    <div className="container-app py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Cardápio</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted">
          Servido todos os dias, das 06h30 às 00h00. Encomendas fora deste horário são preparadas na abertura seguinte.
        </p>
      </header>
      <MenuBrowser products={products} />
    </div>
  );
}
