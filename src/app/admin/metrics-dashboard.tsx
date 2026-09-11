'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, Bike, Store, Banknote, Landmark, CreditCard, Smartphone, Phone, MapPin, StickyNote } from 'lucide-react';
import type { MetricSummary, DailyRevenue } from '@/domains/admin/metrics';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur, dateTimePT } from '@/domains/shared-kernel/money';

type OrderRow = {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  totalCents: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string | null;
  addressLine: string;
  items: { name: string; qty: number; options: string[] }[];
  createdAt: string;
};

function variation(cur: number, prev: number) {
  if (prev <= 0) return cur > 0 ? { type: 'new', text: 'novo' } : { type: 'flat', text: '—' };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { type: 'flat' as const, text: '0%' };
  return { type: (pct > 0 ? 'up' : 'down') as 'up' | 'down', text: `${pct > 0 ? '+' : ''}${pct}%` };
}

export function MetricsDashboard({ summaries, series, orders, monthLabel }: {
  summaries: MetricSummary[];
  series: DailyRevenue[];
  orders: OrderRow[];
  monthLabel: string;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const month = summaries.find((s) => s.key === 'month')!;
  const ticket = month.count > 0 ? Math.round(month.revenueCents / month.count) : 0;
  const deliveries = orders.filter((o) => o.deliveryMethod === 'DELIVERY').length;
  const pickups = orders.filter((o) => o.deliveryMethod === 'PICKUP').length;

  const maxSeries = useMemo(() => Math.max(...series.map((s) => s.revenueCents), 1), [series]);

  const refresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Atualizado agora · dados no fuso da loja (Lisboa)</p>
        <button onClick={refresh} className="btn-ghost text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Cards dos períodos */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summaries.map((s) => {
          const v = variation(s.revenueCents, s.prevRevenueCents);
          return (
            <section key={s.key} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{s.label}</p>
              <p className="mt-2 font-display text-3xl font-extrabold tracking-tight">{eur(s.revenueCents)}</p>
              <p className="mt-1 text-sm text-muted">
                {s.count} {s.count === 1 ? 'pedido' : 'pedidos'}
                <span className="mx-1.5 text-line">·</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${v.type === 'up' ? 'text-success' : v.type === 'down' ? 'text-danger' : 'text-muted'}`}>
                  {v.type === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : v.type === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  {v.text}
                </span>
                <span className="ml-1 text-muted/70">vs. {s.prevLabel}</span>
              </p>
            </section>
          );
        })}
      </div>

      {/* Receita últimos 14 dias */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold">Receita — últimos 14 dias</h2>
          <span className="chip bg-ink/5 text-xs">{eur(series.reduce((s, d) => s + d.revenueCents, 0))}</span>
        </div>
        <div className="mt-4 flex h-36 items-end gap-1.5">
          {series.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${eur(d.revenueCents)} (${d.count})`}>
              <div
                className={`w-full rounded-t-md transition-colors ${d.isToday ? 'bg-accent' : 'bg-ink/15 group-hover:bg-ink/30'}`}
                style={{ height: `${Math.max((d.revenueCents / maxSeries) * 100, d.revenueCents > 0 ? 6 : 2)}%` }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-semibold text-surface group-hover:block">
                {d.label} · {eur(d.revenueCents)}
              </span>
              <span className="mt-1 hidden text-center text-[9px] text-muted md:block">{d.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pedidos do mês */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold">Pedidos de {monthLabel}</h2>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="chip bg-ink/5">Ticket médio {eur(ticket)}</span>
            <span className="chip bg-ink/5"><Bike className="h-3 w-3" /> {deliveries} entregas</span>
            <span className="chip bg-ink/5"><Store className="h-3 w-3" /> {pickups} levantamentos</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Ainda não há pedidos este mês.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {orders.map((o) => {
              const meta = LIFECYCLE[o.status];
              const expanded = open === o.id;
              const PayIcon = { CASH: Banknote, CARD: CreditCard, MBWAY: Smartphone, MULTIBANCO: Landmark }[o.paymentMethod] ?? Banknote;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setOpen(expanded ? null : o.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        {o.number}
                        <span className={`chip text-[11px] font-bold ${meta?.order === 9 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                          {meta?.label ?? o.status}
                        </span>
                        <span className="font-normal text-muted">{eur(o.totalCents)}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {o.customerName} · {o.customerPhone} · {o.customerEmail}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted/70">{dateTimePT(new Date(o.createdAt))}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 flex-none text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="pb-4 pl-4 text-sm">
                      <ul className="space-y-1 text-muted">
                        {o.items.map((i, idx) => (
                          <li key={idx}><span className="font-semibold text-ink">{i.qty}×</span> {i.name}{i.options.length ? <span className="text-muted"> — {i.options.join(' · ')}</span> : null}</li>
                        ))}
                      </ul>
                      <p className="mt-2 flex items-center gap-1.5 text-muted">
                        <Phone className="h-3.5 w-3.5" /> {o.customerPhone}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-muted">
                        <MapPin className="h-3.5 w-3.5" /> {o.addressLine}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-muted">
                        <PayIcon className="h-3.5 w-3.5" /> {paymentMethodLabel(o.paymentMethod)} · {o.paymentStatus === 'PAID' ? 'pago' : o.paymentStatus === 'FAILED' ? 'falhou' : 'pendente'}
                      </p>
                      {o.note && (
                        <p className="mt-1 flex items-start gap-1.5 text-muted">
                          <StickyNote className="mt-0.5 h-3.5 w-3.5" /> {o.note}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
