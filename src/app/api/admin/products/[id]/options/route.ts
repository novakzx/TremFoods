import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { optionsPutSchema } from '@/domains/menu/validators';
import { replaceOptionGroups } from '@/domains/menu/menu-admin';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const groups = await prisma.optionGroup.findMany({
    where: { productId: params.id },
    orderBy: { sort: 'asc' },
    include: { options: { orderBy: { sort: 'asc' } } },
  });
  return NextResponse.json({ groups });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Produto não encontrado.' } }, { status: 404 });
  }

  const body = await parseJson(req);
  const parsed = optionsPutSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  await replaceOptionGroups(params.id, parsed.data.groups);
  await audit('admin.product.options', req, user.id, user.email, { productId: params.id, groups: parsed.data.groups.length });
  log('info', 'admin.product.options', { productId: params.id, groups: parsed.data.groups.length });
  return NextResponse.json({ ok: true });
}
