import { prisma } from '@/infra/db';
import type { ProductView } from '@/components/menu-browser';

// Cardápio público (página inicial e /cardapio): só artigos disponíveis,
// ordenados por categoria e depois pela ordem definida no painel.
export async function listMenuProducts(): Promise<ProductView[]> {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      include: { category: { select: { id: true, name: true, slug: true, sort: true } }, _count: { select: { optionGroups: true } } },
      orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
    });
    return products.map((p) => ({
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
      hasOptions: p._count.optionGroups > 0,
    }));
  } catch (error) {
    console.error('[menu] Error loading products:', error);
    return [];
  }
}
