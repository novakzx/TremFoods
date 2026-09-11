import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { subscribeSchema, unsubscribeSchema } from '@/domains/notifications/validators';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { log, logValidation } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { endpoint, keysP256dh, keysAuth, orderNumber, code } = parsed.data;
  const { user } = await requireUser();

  // Subscrição a um pedido exige ser o dono (sessão) ou saber os 4 dígitos do
  // telefone — mesma regra do acompanhamento público.
  if (orderNumber) {
    const order = await prisma.order.findUnique({
      where: { number: orderNumber },
      select: { userId: true, customerPhone: true },
    });
    if (!order) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } }, { status: 404 });
    }
    const owner = Boolean(user && order.userId === user.id);
    const knowsCode = Boolean(code && order.customerPhone?.replace(/\D/g, '').endsWith(code));
    if (!owner && !knowsCode) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Código de acompanhamento inválido.' } }, { status: 403 });
    }
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keysP256dh, keysAuth, userId: user?.id ?? null, orderNumber: orderNumber ?? null },
    create: { endpoint, keysP256dh, keysAuth, userId: user?.id ?? null, orderNumber: orderNumber ?? null },
  });
  log('info', 'push.subscribed', { orderNumber: orderNumber ?? null, userId: user?.id ?? null });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return NextResponse.json({ ok: true });
}
