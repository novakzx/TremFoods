import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminNav } from '../admin-nav';
import { MetricsDashboard } from '../metrics-dashboard';
import { requireUser } from '@/domains/account/session';
import { metricWindows, summarizeOrders, revenueSeries, dashboardOrders } from '@/domains/admin/metrics';
import { eur } from '@/domains/shared-kernel/money';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Métricas — Painel de gestão',
  robots: { index: false, follow: false },
};

const MONTH_FMT = new Intl.DateTimeFormat('pt-PT', { month: 'long', timeZone: 'Europe/Lisbon' });

export default async function AdminDashboardPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/admin/dashboard');
  if (user.role !== 'ADMIN') redirect('/');

  const now = new Date();
  const windows = metricWindows(now);
  let orders: any[] = [];
  try {
    orders = await dashboardOrders(now);
  } catch (err) {
    console.error('[AdminDashboardPage] Error loading dashboard orders:', err);
  }
  const summaries = summarizeOrders(orders, windows);
  const series = revenueSeries(orders, 14, now);

  const monthStart = windows[2].from;
  const monthOrders = orders.filter((o) => o.createdAt >= monthStart);
  const monthLabel = MONTH_FMT.format(monthStart).trim();

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Métricas</h1>
          <p className="mt-1 text-sm text-muted">Receita e pedidos por período, em comparação com o período anterior.</p>
        </div>
        <span className="chip bg-ink/5 text-sm">
          {eur(summaries.reduce((s, m) => s + (m.key === 'month' ? m.revenueCents : 0), 0))} este mês
        </span>
      </div>

      <AdminNav active="metrics" />

      <MetricsDashboard
        summaries={summaries}
        series={series}
        monthLabel={monthLabel}
        orders={monthOrders.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          deliveryMethod: o.deliveryMethod as 'DELIVERY' | 'PICKUP',
          totalCents: o.totalCents,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerEmail: o.customerEmail ?? o.user.email,
          note: o.note,
          addressLine:
            o.deliveryMethod === 'DELIVERY'
              ? [o.addressStreet, o.addressNumber, o.addressCity, o.addressPostal].filter(Boolean).join(', ')
              : 'Levantamento no balcão',
          items: o.items.map((i: any) => ({ name: i.nameSnapshot, qty: i.qty, options: Array.isArray(i.optionsJson) ? (i.optionsJson as { name: string }[]).map((x) => x.name) : [] })),
          createdAt: o.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
