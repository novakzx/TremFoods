import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Landmark, CreditCard, Smartphone, Banknote, Bike, Store, Clock } from 'lucide-react';
import { cookies } from 'next/headers';
import { StatusTimeline } from '@/components/status-timeline';
import { OrderTracker } from './order-tracker';
import { PushToggle } from '@/domains/notifications/push-toggle';
import { requireUser, secrets } from '@/domains/account/session';
import { LIFECYCLE } from '@/domains/orders/order-status';
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

export default async function OrderDetailPage({ params }: { params: { number: string } }) {
  const { user } = await requireUser();
  if (!user) notFound();

  let order = null;
  try {
    order = await prisma.order.findFirst({
      where: { number: params.number, userId: user.id },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
    });
  } catch (err) {
    console.error('[OrderDetailPage] Error loading order:', err);
    notFound();
  }
  if (!order) notFound();

  const meta = LIFECYCLE[order.status];
  const delivery = order.deliveryMethod as 'DELIVERY' | 'PICKUP';
  const PayIcon = { CASH: Banknote, CARD: CreditCard, MBWAY: Smartphone, MULTIBANCO: Landmark }[order.paymentMethod] ?? Banknote;

  return (
    <div className="container-app max-w-3xl py-8 sm:py-10">
      <Link href="/pedidos" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Os meus pedidos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Pedido {order.number}</h1>
          <p className="mt-1 text-sm text-muted">Feito em {dateTimePT(order.createdAt)}</p>
        </div>
        <span className="chip bg-success/10 px-3.5 py-1.5 text-sm font-bold text-success">{meta?.label ?? order.status}</span>
      </div>

      {/* Acompanhamento em tempo real */}
      <section className="card mt-8 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Estado do pedido</h2>
          <OrderTracker number={order.number} initialStatus={order.status} deliveryMethod={delivery} />
        </div>
        <OrderTimelineView status={order.status} deliveryMethod={delivery} events={order.events} />
        <PushToggle orderNumber={order.number} />
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-base font-bold">Artigos</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2.5">
                <span className="text-muted">
                  <span className="font-semibold text-ink">{i.qty}×</span> {i.nameSnapshot}
                  {Array.isArray(i.optionsJson) && (i.optionsJson as { name: string }[]).length > 0 && (
                    <span className="block pl-1 text-xs text-muted/80">
                      {(i.optionsJson as { name: string }[]).map((o) => o.name).join(' · ')}
                    </span>
                  )}
                </span>
                <span className="font-medium">{eur(i.priceCents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-medium">{eur(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{order.deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'}</dt><dd className="font-medium">{order.deliveryFeeCents === 0 ? 'Grátis' : eur(order.deliveryFeeCents)}</dd></div>
            <div className="flex justify-between pt-1"><dt className="font-semibold">Total</dt><dd className="font-display text-lg font-extrabold">{eur(order.totalCents)}</dd></div>
          </dl>
          {order.note && (
            <p className="mt-3 rounded-xl bg-paper px-3.5 py-2.5 text-[13px] text-muted"><span className="font-semibold text-ink">Nota:</span> {order.note}</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-base font-bold">Detalhes</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Entrega</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                {order.deliveryMethod === 'DELIVERY' ? <><Bike className="h-4 w-4 text-muted" /> {order.addressStreet}, {order.addressNumber} · {order.addressPostal}</> : <><Store className="h-4 w-4 text-muted" /> Levantamento no balcão</>}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Tempo estimado</dt>
              <dd className="flex items-center gap-1.5 font-medium"><Clock className="h-4 w-4 text-muted" /> {order.etaMinutes} minutos</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Pagamento</dt>
              <dd className="flex items-center gap-1.5 font-medium"><PayIcon className="h-4 w-4 text-muted" /> {paymentMethodLabel(order.paymentMethod)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Estado do pagamento</dt>
              <dd className={`font-semibold ${order.paymentStatus === 'PAID' ? 'text-success' : order.paymentStatus === 'FAILED' ? 'text-danger' : 'text-ink/60'}`}>
                {order.paymentStatus === 'PAID' ? 'Pago' : order.paymentStatus === 'FAILED' ? 'Falhou' : 'Pendente'}
              </dd>
            </div>
          </dl>

          {order.paymentMethod === 'MULTIBANCO' && order.paymentStatus !== 'PAID' && order.paymentMeta && (
            <div className="mt-4 rounded-2xl border border-dashed border-ink/25 bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Referência Multibanco</p>
              <p className="mt-2 flex justify-between text-sm"><span className="text-muted">Entidade</span><span className="font-mono font-bold">{String((order.paymentMeta as { entity?: string }).entity ?? '')}</span></p>
              <p className="mt-1 flex justify-between text-sm"><span className="text-muted">Referência</span><span className="font-mono font-bold tracking-wider">{String((order.paymentMeta as { reference?: string }).reference ?? '')}</span></p>
              <p className="mt-1 flex justify-between text-sm"><span className="text-muted">Valor</span><span className="font-bold">{eur(order.totalCents)}</span></p>
            </div>
          )}

          {order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING' && (
            <p className="mt-4 rounded-xl bg-accent/10 px-3.5 py-3 text-[13px] font-medium text-accent-ink">Pague em dinheiro {order.deliveryMethod === 'DELIVERY' ? 'ao estafeta' : 'no balcão'} — tenha o valor pronto se possível.</p>
          )}
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/cardapio" className="btn-secondary">Fazer novo pedido</Link>
        <Link href="/pedidos" className="btn-ghost">Ver histórico</Link>
      </div>
    </div>
  );
}

function OrderTimelineView({ status, deliveryMethod, events }: { status: string; deliveryMethod: 'DELIVERY' | 'PICKUP'; events: { status: string; createdAt: Date }[] }) {
  return <StatusTimeline status={status} deliveryMethod={deliveryMethod} events={events.map((e) => ({ status: e.status, at: e.createdAt }))} />;
}
