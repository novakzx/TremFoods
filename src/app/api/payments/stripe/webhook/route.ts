import { NextResponse } from 'next/server';
import { settleWebhook } from '@/domains/payment/gateway';
import { audit, log } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

// O webhook é autenticado pela assinatura do Stripe (STRIPE_WEBHOOK_SECRET);
// não usa cookies de sessão nem CSRF (é uma integração servidor-a-servidor).
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  try {
    const result = await settleWebhook(body, signature);
    if (!result.handled) {
      return NextResponse.json({ received: false, reason: 'PAYMENTS_NOT_CONFIGURED' }, { status: 200 });
    }
    const event = result.event as { type?: string; data?: { object?: { metadata?: { orderNumber?: string }; payment_status?: string; amount?: number } } };
    const obj = event.data?.object;
    const orderNumber = obj?.metadata?.orderNumber;

    if (orderNumber) {
      if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
        await prisma.order.update({
          where: { number: orderNumber },
          data: { paymentStatus: 'PAID', paymentRef: event.type },
        });
        await audit('order.payment.paid', null, null, null, { orderNumber });
        log('info', 'stripe.webhook.paid', { orderNumber });
      }
      if (event.type === 'payment_intent.payment_failed') {
        await prisma.order.update({ where: { number: orderNumber }, data: { paymentStatus: 'FAILED' } });
        log('warn', 'stripe.webhook.failed', { orderNumber });
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    const err = e as Error & { status?: number };
    log('error', 'stripe.webhook.error', { error: err.message });
    return NextResponse.json({ error: { code: 'WEBHOOK_INVALID', message: 'Assinatura inválida.' } }, { status: err.status ?? 400 });
  }
}
