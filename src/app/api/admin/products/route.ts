import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { prisma } from '@/infra/db';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, logValidation } from '@/infra/logging';
import { productSchema } from '@/domains/menu/validators';
import { createProduct } from '@/domains/menu/menu-admin';

export const dynamic = 'force-dynamic';

const FORBIDDEN = () => NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });

export async function GET() {
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') return FORBIDDEN();

  const products = await prisma.product.findMany({
    orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
    include: { category: { select: { name: true, slug: true } }, _count: { select: { optionGroups: true } } },
  });
  return NextResponse.json({
    products: products.map((p) => ({
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
    })),
  });
}

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') return FORBIDDEN();

  const body = await parseJson(req);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const result = await createProduct(parsed.data);
  if (result.error === 'SLUG_TAKEN') {
    return NextResponse.json({ error: { code: 'SLUG_TAKEN', message: 'Já existe um produto com este slug.' } }, { status: 409 });
  }
  await audit('admin.product.created', req, user.id, user.email, { productId: result.product.id, name: result.product.name });
  return NextResponse.json({ ok: true, product: result.product }, { status: 201 });
}
