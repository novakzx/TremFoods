import Stripe from 'stripe';
import { env } from '@/infra/config';
import { log } from '@/infra/logging';
import { eur } from '@/domains/shared-kernel/money';

/** Cliente Stripe — só instancia se a chave estiver configurada. */
function stripeClient() {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

export type PaymentOutcome =
  | { type: 'stripe'; url: string }
  | { type: 'multibanco'; entity: string; reference: string; amountLabel: string; expiresLabel: string }
  | { type: 'none' };

/**
 * Cria uma Checkout Session do Stripe para o método escolhido.
 * - CARD    → payment_method_types ['card']
 * - MBWAY   → payment_method_types ['mbway']
 * - MULTIBANCO → PaymentIntent com display de referência (entidade + referência + validade)
 * Retorno seguro: se a Stripe não estiver configurada, devolve erro amigável.
 */
export async function beginPayment(opts: {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  method: 'CARD' | 'MBWAY' | 'MULTIBANCO';
  customerEmail: string | null;
  customerName: string;
}): Promise<PaymentOutcome> {
  const s = stripeClient();
  if (!s) {
    throw Object.assign(new Error('Pagamentos por cartão indisponíveis neste momento. Tente dinheiro na entrega.'), { status: 503, code: 'STRIPE_NOT_CONFIGURED' });
  }

  const successUrl = `${env.APP_URL}/pedidos/${opts.orderNumber}?stripe=success`;
  const cancelUrl = `${env.APP_URL}/pedidos/${opts.orderNumber}?stripe=cancelled`;

  if (opts.method === 'MULTIBANCO') {
    const intent = await s.paymentIntents.create({
      amount: opts.amountCents,
      currency: 'eur',
      payment_method_types: ['multibanco'],
      description: `Pedido ${opts.orderNumber}`,
      metadata: { orderRef: opts.orderNumber },
      receipt_email: opts.customerEmail ?? undefined,
    });
    const display = intent.next_action?.multibanco_display_details;
    if (!display) {
      throw Object.assign(new Error('Não foi possível gerar a referência Multibanco.'), { status: 502 });
    }
    const amountLabel = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(opts.amountCents / 100);
    const expiresLabel = display.expires_at
      ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(display.expires_at * 1000))
      : '—';
    return {
      type: 'multibanco',
      entity: display.entity ?? '',
      reference: display.reference ?? '',
      amountLabel,
      expiresLabel,
    };
  }

  const session = await s.checkout.sessions.create({
    mode: 'payment',
    // 'mbway' existe na API do Stripe mas pode não estar no enum de tipos do SDK instalado.
    payment_method_types: (opts.method === 'MBWAY' ? ['mbway'] : ['card']) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: `Trem Food — Pedido ${opts.orderNumber}` },
          unit_amount: opts.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: opts.customerEmail ?? undefined,
    metadata: { orderNumber: opts.orderNumber },
  });
  if (!session.url) throw Object.assign(new Error('Falha ao criar sessão de pagamento.'), { status: 502 });
  return { type: 'stripe', url: session.url };
}

export async function settleWebhook(body: string, signature: string | null) {
  const s = stripeClient();
  if (!s || !env.STRIPE_WEBHOOK_SECRET) return { handled: false };
  try {
    const event = s.webhooks.constructEvent(body, signature ?? '', env.STRIPE_WEBHOOK_SECRET);
    log('info', 'stripe.webhook', { type: event.type });
    return { handled: true, event };
  } catch (e) {
    log('error', 'stripe.webhook.invalid', { error: (e as Error).message });
    throw Object.assign(new Error('Assinatura de webhook inválida'), { status: 400 });
  }
}
