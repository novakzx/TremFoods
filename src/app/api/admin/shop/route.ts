import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { setStoreClosed } from '@/domains/shop/shop-policy';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ closed: z.boolean() });

export async function PATCH(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });
  }

  const body = await parseJson(req);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  await setStoreClosed(parsed.data.closed);
  await audit('admin.shop.closed', req, user.id, user.email, { closed: parsed.data.closed });
  log('info', 'admin.shop.closed', { closed: parsed.data.closed });
  return NextResponse.json({ ok: true });
}
