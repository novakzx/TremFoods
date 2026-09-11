import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { productPatchSchema } from '@/domains/menu/validators';
import { updateProduct, disableProduct } from '@/domains/menu/menu-admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }

  const body = await parseJson(req);
  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const result = await updateProduct(params.id, parsed.data);
  if (result.error === 'SLUG_TAKEN') {
    return NextResponse.json({ error: { code: 'SLUG_TAKEN', message: 'Já existe um produto com este slug.' } }, { status: 409 });
  }
  if (result.error === 'NOT_FOUND') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Produto não encontrado.' } }, { status: 404 });
  }
  await audit('admin.product.updated', req, user.id, user.email, { productId: result.product.id, name: result.product.name });
  log('info', 'admin.product.updated', { productId: result.product.id });
  return NextResponse.json({ ok: true, product: result.product });
}

// Remover = desativar (o histórico de pedidos mantém snapshots dos artigos).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const product = await disableProduct(params.id);
  if (!product) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Produto não encontrado.' } }, { status: 404 });
  }
  await audit('admin.product.disabled', req, user.id, user.email, { productId: product.id });
  return NextResponse.json({ ok: true, product });
}
