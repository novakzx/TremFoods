import { prisma } from '@/infra/db';

export type ProductInput = {
  name: string;
  slug?: string;
  priceCents: number;
  categoryId: string;
  image: string;
  description: string;
  isFeatured: boolean;
  isNew: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  sort: number;
  available: boolean;
};

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Slug único com sufixo numérico quando há colisão (ex.: "x-salada-2").
async function uniqueSlug(base: string): Promise<string> {
  const existing = new Set(
    (await prisma.product.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((p) => p.slug),
  );
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

type CreateResult = { error: 'SLUG_TAKEN' } | { error: null; product: Awaited<ReturnType<typeof prisma.product.create>> };

export async function createProduct(data: ProductInput): Promise<CreateResult> {
  const slug = data.slug?.trim() ? data.slug : await uniqueSlug(slugify(data.name));
  const clash = await prisma.product.findUnique({ where: { slug } });
  if (clash) return { error: 'SLUG_TAKEN' };
  const product = await prisma.product.create({ data: { ...data, slug } });
  return { error: null, product };
}

type UpdateResult =
  | { error: 'SLUG_TAKEN' }
  | { error: 'NOT_FOUND' }
  | { error: null; product: { id: string; name: string; slug: string } };

export async function updateProduct(id: string, data: Partial<ProductInput> & { slug?: string }): Promise<UpdateResult> {
  if (data.slug) {
    const clash = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (clash) return { error: 'SLUG_TAKEN' };
  }
  const product = await prisma.product
    .update({ where: { id }, data, select: { id: true, name: true, slug: true } })
    .catch(() => null);
  return product ? { error: null, product } : { error: 'NOT_FOUND' };
}

// Eliminação suave: nunca se apaga um produto (o histórico de pedidos depende
// do snapshot), apenas se desativa com `available=false`.
export async function disableProduct(id: string) {
  const product = await prisma.product
    .update({ where: { id }, data: { available: false }, select: { id: true, available: true } })
    .catch(() => null);
  return product;
}

export type CategoryInput = { name: string; slug?: string; description?: string | null; sort: number };

type CategoryCreateResult = { error: 'SLUG_TAKEN' } | { error: null; category: Awaited<ReturnType<typeof prisma.category.create>> };

export async function createCategory(data: CategoryInput): Promise<CategoryCreateResult> {
  const slug = data.slug?.trim() ? data.slug : await uniqueCategorySlug(slugify(data.name));
  const clash = await prisma.category.findUnique({ where: { slug } });
  if (clash) return { error: 'SLUG_TAKEN' };
  const category = await prisma.category.create({ data: { ...data, slug, description: data.description ?? null } });
  return { error: null, category };
}

async function uniqueCategorySlug(base: string): Promise<string> {
  const existing = new Set(
    (await prisma.category.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((c) => c.slug),
  );
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

type CategoryUpdateResult =
  | { error: 'SLUG_TAKEN' }
  | { error: 'NOT_FOUND' }
  | { error: null; category: { id: string; name: string; slug: string } };

export async function updateCategory(id: string, data: Partial<CategoryInput>): Promise<CategoryUpdateResult> {
  if (data.slug) {
    const clash = await prisma.category.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (clash) return { error: 'SLUG_TAKEN' };
  }
  const category = await prisma.category
    .update({ where: { id }, data, select: { id: true, name: true, slug: true } })
    .catch(() => null);
  return category ? { error: null, category } : { error: 'NOT_FOUND' };
}

// Categorias com produtos não se apagam (evita órfãos no cardápio).
export async function deleteCategoryIfEmpty(id: string): Promise<{ error: null } | { error: 'NOT_EMPTY'; count: number }> {
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return { error: 'NOT_EMPTY', count };
  await prisma.category.delete({ where: { id } }).catch(() => null);
  return { error: null };
}

export type OptionInput = { name: string; priceCents: number; available: boolean; sort: number };
export type OptionGroupInput = { name: string; required: boolean; multiple: boolean; maxSelect: number | null; sort: number; options: OptionInput[] };

// Substituição total dos grupos de um produto (transação). O carrinho guarda
// snapshot dos preços, pelo que os ids antigos podem ser recriados à vontade.
export async function replaceOptionGroups(productId: string, groups: OptionGroupInput[]) {
  await prisma.$transaction(async (tx) => {
    await tx.optionGroup.deleteMany({ where: { productId } });
    for (const g of groups) {
      await tx.optionGroup.create({
        data: {
          productId,
          name: g.name,
          required: g.required,
          multiple: g.multiple,
          maxSelect: g.multiple ? g.maxSelect : null,
          sort: g.sort,
          options: { create: g.options },
        },
      });
    }
  });
}
