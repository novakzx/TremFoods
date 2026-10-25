import { NextResponse } from 'next/server';
import { settleWebhook } from '@/domains/payment/gateway';
import { audit, log } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

type StripeObject = {
  metadata?: { orderNumber?: string } | null;
  payment_status?: string;
  amount?: number;
  amount_total?: number | null;
};

// Eventos que confirmam o pagamento. `checkout.session.completed` só conta se
// a sessão já estiver paga (métodos assíncronos chegam depois, em
// `async_payment_succeeded`).
function outcomeOf(type: string, obj: StripeObject): 'PAID' | 'FAILED' | null {
  switch (type) {
    case 'checkout.session.completed':
      return obj.payment_status === 'paid' ? 'PAID' : null;
    case 'checkout.session.async_payment_succeeded':
    case 'payment_intent.succeeded':
      return 'PAID';
    case 'checkout.session.async_payment_failed':
    case 'payment_intent.payment_failed':
      return 'FAILED';
    default:
      return null;
  }
}

// O webhook é autenticado pela assinatura do Stripe (STRIPE_WEBHOOK_SECRET);
// não usa cookies de sessão nem CSRF (é uma integração servidor-a-servidor).
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  let event: { type: string; data: { object: StripeObject } };
  try {
    const result = await settleWebhook(body, signature);
    if (!result.handled) {
      return NextResponse.json({ received: false, reason: 'PAYMENTS_NOT_CONFIGURED' }, { status: 200 });
    }
    event = result.event as unknown as typeof event;
  } catch (e) {
    log('error', 'stripe.webhook.error', { error: (e as Error).message });
    return NextResponse.json({ error: { code: 'WEBHOOK_INVALID', message: 'Assinatura inválida.' } }, { status: 400 });
  }

  const obj = event.data.object;
  const orderNumber = obj.metadata?.orderNumber;
  const outcome = outcomeOf(event.type, obj);
  if (!orderNumber || !outcome) return NextResponse.json({ received: true });

  const order = await prisma.order.findUnique({ where: { number: orderNumber }, select: { id: true, totalCents: true, paymentStatus: true } });
  if (!order) {
    log('warn', 'stripe.webhook.unknown_order', { orderNumber, type: event.type });
    return NextResponse.json({ received: true });
  }

  if (outcome === 'PAID') {
    // Defesa extra: o valor cobrado tem de ser o total do pedido.
    const paid = obj.amount_total ?? obj.amount;
    if (typeof paid === 'number' && paid !== order.totalCents) {
      log('error', 'stripe.webhook.amount_mismatch', { orderNumber, paid, expected: order.totalCents });
      return NextResponse.json({ received: true });
    }
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', paymentRef: event.type } });
    await audit('order.payment.paid', null, null, null, { orderNumber });
    log('info', 'stripe.webhook.paid', { orderNumber });
  } else if (order.paymentStatus !== 'PAID') {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
    log('warn', 'stripe.webhook.failed', { orderNumber });
  }
  return NextResponse.json({ received: true });
}
