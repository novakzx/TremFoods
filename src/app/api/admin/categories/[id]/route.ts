import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { categoryPatchSchema } from '@/domains/menu/validators';
import { updateCategory, deleteCategoryIfEmpty } from '@/domains/menu/menu-admin';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const body = await parseJson(req);
  const parsed = categoryPatchSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const result = await updateCategory(params.id, parsed.data);
  if (result.error === 'SLUG_TAKEN') {
    return NextResponse.json({ error: { code: 'SLUG_TAKEN', message: 'Já existe uma categoria com este slug.' } }, { status: 409 });
  }
  if (result.error === 'NOT_FOUND') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Categoria não encontrada.' } }, { status: 404 });
  }
  await audit('admin.category.updated', req, user.id, user.email, { categoryId: result.category.id });
  log('info', 'admin.category.updated', { categoryId: result.category.id });
  return NextResponse.json({ ok: true, category: result.category });
}

// Só remove categorias sem produtos — desativar produtos, nunca apagar.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }
  const result = await deleteCategoryIfEmpty(params.id);
  if (result.error === 'NOT_EMPTY') {
    return NextResponse.json({ error: { code: 'NOT_EMPTY', message: `Esta categoria tem ${result.count} produtos. Mova-os antes de a remover.` } }, { status: 409 });
  }
  await audit('admin.category.deleted', req, user.id, user.email, { categoryId: params.id });
  return NextResponse.json({ ok: true });
}
