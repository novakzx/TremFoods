import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StatusTimeline } from '@/components/status-timeline';
import { OrderTracker } from './order-tracker';
import { PushToggle } from '@/domains/notifications/push-toggle';
import { requireUser } from '@/domains/account/session';
import { statusLabel } from '@/domains/orders/order-status';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur, dateTimePT } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { number: string } }): Promise<Metadata> {
  return {
    title: `Pedido ${params.number}`,
    robots: { index: false, follow: false },
  };
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  PAID: { label: 'Pago', className: 'text-success' },
  FAILED: { label: 'Falhou', className: 'text-danger' },
  PENDING: { label: 'Por pagar', className: 'text-muted' },
};

export default async function OrderDetailPage({ params, searchParams }: { params: { number: string }; searchParams: { stripe?: string } }) {
  const { user } = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pedido/${params.number}`)}`);

  const order = await prisma.order
    .findFirst({
      where: { number: params.number, userId: user.id },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    .catch((err) => {
      console.error('[OrderDetailPage] Error loading order:', err);
      return null;
    });
  if (!order) notFound();

  const delivery = order.deliveryMethod as 'DELIVERY' | 'PICKUP';
  const pay = PAYMENT_STATUS[order.paymentStatus] ?? PAYMENT_STATUS.PENDING;
  const chip =
    order.status === 'DELIVERED' ? 'bg-success/10 text-success' : order.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-deep';

  return (
    <div className="container-app max-w-3xl py-6 sm:py-8">
      <Link href="/pedidos" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Os meus pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Pedido {order.number}</h1>
          <p className="mt-0.5 text-sm text-muted">{dateTimePT(order.createdAt)}</p>
        </div>
        <span className={`chip px-3 py-1 text-sm font-semibold ${chip}`}>{statusLabel(order.status, delivery)}</span>
      </div>

      {searchParams.stripe === 'success' && order.paymentStatus !== 'PAID' && (
        <p className="alert-info mt-4">Pagamento recebido pelo Stripe — a confirmação chega em instantes.</p>
      )}
      {searchParams.stripe === 'cancelled' && order.paymentStatus !== 'PAID' && (
        <p className="alert-error mt-4">O pagamento foi cancelado. O pedido mantém-se; contacte-nos para pagar de outra forma: 964 994 787.</p>
      )}

      <section className="card mt-5 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Estado</h2>
          <OrderTracker number={order.number} status={order.status} paymentStatus={order.paymentStatus} />
        </div>
        <StatusTimeline status={order.status} deliveryMethod={delivery} events={order.events.map((e) => ({ status: e.status, at: e.createdAt }))} />
        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && <PushToggle orderNumber={order.number} />}
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="font-semibold">Artigos</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span className="text-muted">
                  <span className="font-semibold text-ink">{i.qty}×</span> {i.nameSnapshot}
                  {Array.isArray(i.optionsJson) && (i.optionsJson as { name: string }[]).length > 0 && (
                    <span className="block text-xs">{(i.optionsJson as { name: string }[]).map((o) => o.name).join(' · ')}</span>
                  )}
                </span>
                <span className="flex-none">{eur(i.priceCents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-1 space-y-1 border-t border-line pt-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{eur(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{delivery === 'DELIVERY' ? 'Entrega' : 'Levantamento'}</dt><dd>{order.deliveryFeeCents === 0 ? 'Grátis' : eur(order.deliveryFeeCents)}</dd></div>
            <div className="flex justify-between pt-1 font-bold"><dt>Total</dt><dd>{eur(order.totalCents)}</dd></div>
          </dl>
          {order.note && <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[13px] text-muted"><span className="font-semibold text-ink">Nota:</span> {order.note}</p>}
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-semibold">Detalhes</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-muted">{delivery === 'DELIVERY' ? 'Morada de entrega' : 'Levantamento'}</dt>
              <dd>
                {delivery === 'DELIVERY'
                  ? [`${order.addressStreet ?? ''}, ${order.addressNumber ?? ''}`, [order.addressPostal, order.addressCity].filter(Boolean).join(' ')].join(' · ')
                  : 'No balcão — Av. António José Gomes 6, Almada'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Tempo estimado</dt>
              <dd>{order.etaMinutes ?? '—'} minutos</dd>
            </div>
            <div>
              <dt className="text-muted">Pagamento</dt>
              <dd>
                {paymentMethodLabel(order.paymentMethod)} · <span className={`font-semibold ${pay.className}`}>{pay.label}</span>
              </dd>
            </div>
          </dl>

          {order.paymentMethod === 'MULTIBANCO' && order.paymentStatus !== 'PAID' && order.paymentMeta && (
            <dl className="mt-3 space-y-1 rounded-lg border border-line bg-paper p-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Entidade</dt><dd className="font-mono font-bold">{String((order.paymentMeta as { entity?: string }).entity ?? '')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Referência</dt><dd className="font-mono font-bold tracking-wider">{String((order.paymentMeta as { reference?: string }).reference ?? '')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Valor</dt><dd className="font-bold">{eur(order.totalCents)}</dd></div>
            </dl>
          )}

          {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && order.status !== 'CANCELLED' && (
            <p className="mt-3 text-[13px] text-muted">Pague em dinheiro {delivery === 'DELIVERY' ? 'ao estafeta' : 'no balcão'}.</p>
          )}
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/cardapio" className="btn-secondary">Fazer novo pedido</Link>
      </div>
    </div>
  );
}
