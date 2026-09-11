import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminNav } from '../admin-nav';
import { MenuManager } from './menu-manager';
import { requireUser } from '@/domains/account/session';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cardápio — Painel de gestão',
  robots: { index: false, follow: false },
};

export default async function AdminMenuPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/admin/menu');
  if (user.role !== 'ADMIN') redirect('/');

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const [dbProducts, dbCategories] = await Promise.all([
      prisma.product.findMany({
        orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
        include: { category: { select: { name: true } }, _count: { select: { optionGroups: true } } },
      }),
      prisma.category.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { products: true } } } }),
    ]);
    products = dbProducts;
    categories = dbCategories;
  } catch (err) {
    console.error('[AdminMenuPage] Error loading menu data:', err);
  }

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Cardápio</h1>
          <p className="mt-1 text-sm text-muted">Produtos, preços, fotos e adicionais — as alterações ficam visíveis no site de imediato.</p>
        </div>
        <span className="chip bg-ink/5 text-sm">{products.length} produtos · {categories.length} categorias</span>
      </div>

      <AdminNav active="menu" />

      <MenuManager
        initialProducts={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: p.categoryId,
          category: p.category.name,
          priceCents: p.priceCents,
          image: p.image,
          isFeatured: p.isFeatured,
          isNew: p.isNew,
          isVegetarian: p.isVegetarian,
          isSpicy: p.isSpicy,
          sort: p.sort,
          available: p.available,
          hasOptions: p._count.optionGroups > 0,
        }))}
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          sort: c.sort,
          productsCount: c._count.products,
        }))}
      />
    </div>
  );
}
