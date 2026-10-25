import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { beginPayment } from '@/domains/payment/gateway';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log } from '@/infra/logging';
import { prisma } from '@/infra/db';

const bodySchema = z.object({
  number: z.string().regex(/^TF-\d{6}$/),
  method: z.enum(['CARD', 'MBWAY', 'MULTIBANCO']),
});

// Repetir/alterar o pagamento online de um pedido próprio ainda por pagar.
export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });

  const parsed = bodySchema.safeParse(await parseJson(req));
  if (!parsed.success) return VALIDATION_ERROR('Parâmetros inválidos.');
  const { number, method } = parsed.data;

  const order = await prisma.order.findUnique({ where: { number } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } }, { status: 404 });
  }
  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ error: { code: 'ALREADY_PAID', message: 'Este pedido já foi pago.' } }, { status: 400 });
  }
  if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
    return NextResponse.json({ error: { code: 'ORDER_CLOSED', message: 'Este pedido já não aceita pagamentos.' } }, { status: 400 });
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: method,
        paymentStatus: 'PENDING',
        ...(payment.type === 'multibanco' ? { paymentMeta: payment as object } : {}),
      },
    });
    await audit('order.payment.started', req, user.id, user.email, { orderId: order.id, method });
    return NextResponse.json({ payment });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    log('warn', 'payment.stripe.failed', { number: order.number, code: err.code });
    return NextResponse.json({ error: { code: 'PAYMENT_UNAVAILABLE', message: err.code === 'STRIPE_NOT_CONFIGURED' ? 'Pagamentos online indisponíveis neste momento. Escolha dinheiro na entrega.' : 'Não foi possível iniciar o pagamento. Tente novamente.' } }, { status: 502 });
  }
}
