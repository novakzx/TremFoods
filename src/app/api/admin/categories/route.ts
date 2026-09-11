import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { prisma } from '@/infra/db';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, logValidation } from '@/infra/logging';
import { categorySchema } from '@/domains/menu/validators';
import { createCategory } from '@/domains/menu/menu-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const categories = await prisma.category.findMany({
    orderBy: { sort: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      sort: c.sort,
      productsCount: c._count.products,
    })),
  });
}

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const body = await parseJson(req);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const result = await createCategory(parsed.data);
  if (result.error === 'SLUG_TAKEN') {
    return NextResponse.json({ error: { code: 'SLUG_TAKEN', message: 'Já existe uma categoria com este slug.' } }, { status: 409 });
  }
  await audit('admin.category.created', req, user.id, user.email, { categoryId: result.category.id, name: result.category.name });
  return NextResponse.json({ ok: true, category: result.category }, { status: 201 });
}
