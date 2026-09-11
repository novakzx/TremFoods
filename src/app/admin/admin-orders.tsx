'use client';

import { useMemo, useState } from 'react';
import { Loader2, Banknote, Landmark, CreditCard, Smartphone, Phone, MapPin, Store, StickyNote } from 'lucide-react';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur } from '@/domains/shared-kernel/money';
import { apiPost } from '@/infra/http-client';

type OrderView = {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  totalCents: number;
  totalLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string | null;
  addressLine: string;
  items: { name: string; qty: number; options: string[] }[];
  createdAt: string;
};

const NEXT: Record<string, string[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

export function AdminOrders({ initial }: { initial: OrderView[] }) {
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  const filtered = useMemo(() => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)), [orders, filter]);

  const advance = async (order: OrderView, status: string) => {
    if (busyId) return;
    setBusyId(order.id);
    setErr((e) => ({ ...e, [order.id]: '' }));
    try {
      const r = await apiPost(`/api/admin/orders/${order.id}/status`, { status });
      if (r.ok) {
        setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
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
    <div className="mt-6 space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {['all', 'RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`chip border px-3.5 py-1.5 transition-colors ${filter === s ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink/70 hover:border-ink/30'}`}
          >
            {s === 'all' ? `Todos (${orders.length})` : `${LIFECYCLE[s]?.label ?? s} (${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="card p-8 text-center text-sm text-muted">Sem pedidos neste estado.</p>}

      {filtered.map((o) => {
        const meta = LIFECYCLE[o.status];
        const nexts = NEXT[o.status] ?? [];
        const Icon = { CASH: Banknote, CARD: CreditCard, MBWAY: Smartphone, MULTIBANCO: Landmark }[o.paymentMethod] ?? Banknote;
        return (
          <article key={o.id} className="card p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold">{o.number}</p>
                <p className="text-[13px] text-muted">{eur(o.totalCents)} · {formatDateLabel(o.createdAt)}</p>
              </div>
              <span className={`chip text-sm font-bold ${o.status === 'DELIVERED' ? 'bg-success/10 text-success' : o.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-accent/15 text-accent-ink'}`}>
                {meta?.label ?? o.status}
              </span>
            </header>

            <div className="mt-4 grid gap-4 text-[13px] sm:grid-cols-2">
              <div className="space-y-1.5 text-muted">
                <p><span className="font-semibold text-ink">{o.customerName}</span> · <Phone className="mb-0.5 inline h-3.5 w-3.5" /> {o.customerPhone}</p>
                <p>{o.customerEmail}</p>
                <p className="flex items-start gap-1.5">
                  {o.deliveryMethod === 'DELIVERY' ? <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" /> : <Store className="mt-0.5 h-3.5 w-3.5 flex-none" />}
                  {o.addressLine}
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {paymentMethodLabel(o.paymentMethod)}
                  <span className={o.paymentStatus === 'PAID' ? 'font-bold text-success' : o.paymentStatus === 'FAILED' ? 'font-bold text-danger' : 'text-muted'}>
                    · {o.paymentStatus === 'PAID' ? 'pago' : o.paymentStatus === 'FAILED' ? 'falhou' : 'pendente'}
                  </span>
                </p>
                {o.note && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-paper px-3 py-2">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-none" /> {o.note}
                  </p>
                )}
              </div>
              <ul className="space-y-1 text-muted">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3"><span><span className="font-semibold text-ink">{i.qty}×</span> {i.name}</span></li>
                ))}
              </ul>
            </div>

            <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {nexts.map((s) => (
                <button
                  key={s}
                  onClick={() => advance(o, s)}
                  disabled={!!busyId}
                  className={s === 'CANCELLED' ? 'btn-ghost !text-danger text-[13px]' : 'btn-primary py-2.5 text-[13px]'}
                >
                  {busyId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {s === 'PREPARING' ? 'Iniciar preparação' : s === 'OUT_FOR_DELIVERY' ? (o.deliveryMethod === 'PICKUP' ? 'Pronto para levantamento' : 'Marcar como saiu para entrega') : s === 'DELIVERED' ? 'Concluir' : 'Cancelar pedido'}
                </button>
              ))}
              {err[o.id] && <span className="text-[13px] font-medium text-danger">{err[o.id]}</span>}
              {nexts.length === 0 && (
                <span className="text-[13px] text-muted">{o.status === 'DELIVERED' ? 'Entregue — bom trabalho.' : 'Sem transições disponíveis.'}</span>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
