'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Phone, MapPin, Store, StickyNote } from 'lucide-react';
import { LIFECYCLE, TRANSITIONS } from '@/domains/orders/lifecycle';
import type { AdminOrderView } from '@/domains/admin/order-ops';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur } from '@/domains/shared-kernel/money';
import { apiGet, apiPost } from '@/infra/http-client';

const FILTERS = ['active', 'RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'all'] as const;
const ACTIVE = new Set(['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY']);
const TIME = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });

function actionLabel(next: string, delivery: 'DELIVERY' | 'PICKUP') {
  if (next === 'PREPARING') return 'Iniciar preparação';
  if (next === 'OUT_FOR_DELIVERY') return delivery === 'PICKUP' ? 'Pronto para levantar' : 'Saiu para entrega';
  if (next === 'DELIVERED') return delivery === 'PICKUP' ? 'Levantado' : 'Entregue';
  return 'Cancelar';
}

export function AdminOrders({ initial }: { initial: AdminOrderView[] }) {
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('active');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [newCount, setNewCount] = useState(0);
  const known = useRef(new Set(initial.map((o) => o.id)));

  // A cozinha vê pedidos novos sem recarregar (a cada 15 s, com a aba visível).
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const r = await apiGet<{ orders: AdminOrderView[] }>('/api/admin/orders').catch(() => null);
      if (!r?.ok) return;
      const fresh = r.data.orders.filter((o) => !known.current.has(o.id));
      fresh.forEach((o) => known.current.add(o.id));
      if (fresh.length) setNewCount((n) => n + fresh.length);
      setOrders(r.data.orders);
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => orders.filter((o) => (filter === 'all' ? true : filter === 'active' ? ACTIVE.has(o.status) : o.status === filter)),
    [orders, filter],
  );
  const countOf = (f: (typeof FILTERS)[number]) =>
    f === 'all' ? orders.length : f === 'active' ? orders.filter((o) => ACTIVE.has(o.status)).length : orders.filter((o) => o.status === f).length;

  const advance = async (order: AdminOrderView, status: string) => {
    if (busyId) return;
    if (status === 'CANCELLED' && !window.confirm(`Cancelar o pedido ${order.number}?`)) return;
    setBusyId(order.id);
    setErr((e) => ({ ...e, [order.id]: '' }));
    try {
      const r = await apiPost(`/api/admin/orders/${order.id}/status`, { status });
      if (r.ok) {
        setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status, ...(status === 'DELIVERED' && o.paymentMethod === 'CASH' ? { paymentStatus: 'PAID' } : {}) } : o)));
      } else {
        setErr((e) => ({ ...e, [order.id]: r.data.error?.message ?? 'Erro ao atualizar.' }));
      }
    } catch {
      setErr((e) => ({ ...e, [order.id]: 'Erro de ligação.' }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      {newCount > 0 && (
        <button onClick={() => { setNewCount(0); setFilter('active'); }} className="alert-info w-full text-left font-semibold">
          {newCount === 1 ? '1 pedido novo' : `${newCount} pedidos novos`} — ver
        </button>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${filter === s ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink/80 hover:border-ink/40'}`}
          >
            {s === 'all' ? 'Todos' : s === 'active' ? 'Em curso' : LIFECYCLE[s]?.label ?? s} ({countOf(s)})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="card p-8 text-center text-sm text-muted">Sem pedidos neste estado.</p>}

      {filtered.map((o) => {
        const nexts = TRANSITIONS[o.status] ?? [];
        return (
          <article key={o.id} className="card p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {o.number} <span className="font-normal text-muted">· {TIME.format(new Date(o.createdAt))} · {eur(o.totalCents)}</span>
              </p>
              <span className={`chip px-2.5 py-0.5 font-semibold ${o.status === 'DELIVERED' ? 'bg-success/10 text-success' : o.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-deep'}`}>
                {LIFECYCLE[o.status]?.label ?? o.status}
              </span>
            </header>

            <div className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
              <ul className="space-y-1">
                {o.items.map((i, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{i.qty}×</span> {i.name}
                    {i.options.length > 0 && <span className="block pl-5 text-muted">+ {i.options.join(', ')}</span>}
                  </li>
                ))}
                {o.note && (
                  <li className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1.5">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-none" /> {o.note}
                  </li>
                )}
              </ul>
              <div className="space-y-1 text-muted">
                <p><span className="font-semibold text-ink">{o.customerName}</span> · <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1 hover:text-ink"><Phone className="h-3.5 w-3.5" />{o.customerPhone}</a></p>
                <p className="flex items-start gap-1.5">
                  {o.deliveryMethod === 'DELIVERY' ? <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" /> : <Store className="mt-0.5 h-3.5 w-3.5 flex-none" />}
                  {o.addressLine}
                </p>
                <p>
                  {paymentMethodLabel(o.paymentMethod)} ·{' '}
                  <span className={o.paymentStatus === 'PAID' ? 'font-semibold text-success' : o.paymentStatus === 'FAILED' ? 'font-semibold text-danger' : ''}>
                    {o.paymentStatus === 'PAID' ? 'pago' : o.paymentStatus === 'FAILED' ? 'pagamento falhou' : 'por pagar'}
                  </span>
                </p>
              </div>
            </div>

            {(nexts.length > 0 || err[o.id]) && (
              <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                {nexts.map((s) => (
                  <button
                    key={s}
                    onClick={() => advance(o, s)}
                    disabled={!!busyId}
                    className={s === 'CANCELLED' ? 'btn-ghost btn-sm text-danger hover:bg-danger/10 hover:text-danger' : 'btn-primary btn-sm'}
                  >
                    {busyId === o.id && s !== 'CANCELLED' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {actionLabel(s, o.deliveryMethod)}
                  </button>
                ))}
                {err[o.id] && <span role="alert" className="text-[13px] font-medium text-danger">{err[o.id]}</span>}
              </footer>
            )}
          </article>
        );
      })}
    </div>
  );
}
