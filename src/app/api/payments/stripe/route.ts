import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { beginPayment } from '@/domains/payment/gateway';
import { parseJson } from '@/infra/api-reply';
import { audit, log } from '@/infra/logging';
import { prisma } from '@/infra/db';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });

  const body = (await parseJson(req) ?? {}) as { number?: string; method?: 'CARD' | 'MBWAY' | 'MULTIBANCO' };
  const method = body.method;
  if (!body.number || (method !== 'CARD' && method !== 'MBWAY' && method !== 'MULTIBANCO')) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Parâmetros inválidos.' } }, { status: 422 });
  }
  const order = await prisma.order.findUnique({ where: { number: body.number } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } }, { status: 404 });
  }
  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ error: { code: 'ALREADY_PAID', message: 'Este pedido já foi pago.' } }, { status: 400 });
  }
  try {
    const payment = await beginPayment({
      orderId: order.id,
      orderNumber: order.number,
      amountCents: order.totalCents,
      method,
      customerEmail: order.customerEmail ?? user.email,
      customerName: order.customerName,
    });
    if (payment.type === 'multibanco') {
      await prisma.order.update({ where: { id: order.id }, data: { paymentMeta: payment as object } });
    } else if (payment.type === 'stripe') {
      await prisma.order.update({ where: { id: order.id }, data: { paymentRef: payment.url } });
    }
    await audit('order.payment.started', req, user.id, user.email, { orderId: order.id, method: body.method });
    return NextResponse.json({ payment });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    log('warn', 'payment.stripe.failed', { number: order.number, code: err.code });
    return NextResponse.json({ error: { code: 'PAYMENT_UNAVAILABLE', message: err.code === 'STRIPE_NOT_CONFIGURED' ? 'Pagamentos online indisponíveis neste momento. Escolha dinheiro na entrega.' : 'Não foi possível iniciar o pagamento. Tente novamente.' } }, { status: err.status ?? 502 });
  }
}
