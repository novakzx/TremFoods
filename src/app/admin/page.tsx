import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminOrders } from './admin-orders';
import { AdminNav } from './admin-nav';
import { ShopControls } from './shop-controls';
import { ProductAvailability } from './product-availability';
import { requireUser } from '@/domains/account/session';
import { shopStatus } from '@/domains/shop/shop-policy';
import { eur } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Painel de gestão',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/');

  let orders: any[] = [];
  let products: any[] = [];
  let status = { open: false, manualClosed: false };

  try {
    const [dbOrders, dbProducts, dbStatus] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { items: true, user: { select: { email: true } } },
      }),
      prisma.product.findMany({
        orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
        include: { category: { select: { name: true } } },
      }),
      shopStatus(),
    ]);
    orders = dbOrders;
    products = dbProducts;
    status = dbStatus;
  } catch (err) {
    console.error('[AdminPage] Error loading admin data:', err);
  }

  const statusLabel = status.open
    ? 'Aberto agora · fecha às 00h00'
    : status.manualClosed
      ? 'Encerrado temporariamente'
      : 'Fechado · abre às 06h30';

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Painel de gestão</h1>
          <p className="mt-1 text-sm text-muted">Estafeta e cozinha — atualize o estado para o cliente acompanhar em tempo real.</p>
        </div>
        <span className="chip bg-ink/5 text-sm">{orders.length} pedidos</span>
      </div>

      <AdminNav active="orders" />

      <AdminOrders
        initial={orders.map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          deliveryMethod: o.deliveryMethod as 'DELIVERY' | 'PICKUP',
          totalCents: o.totalCents,
          totalLabel: eur(o.totalCents),
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShopControls initialClosed={status.manualClosed} statusLabel={statusLabel} />
        <ProductAvailability
          initial={products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category.name,
            priceCents: p.priceCents,
            available: p.available,
          }))}
        />
      </div>
    </div>
  );
}
