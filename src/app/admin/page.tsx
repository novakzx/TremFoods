import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminOrders } from './admin-orders';
import { AdminNav } from './admin-nav';
import { ShopControls } from './shop-controls';
import { ProductAvailability } from './product-availability';
import { requireUser } from '@/domains/account/session';
import { shopStatus } from '@/domains/shop/shop-policy';
import { withinOpeningHours } from '@/domains/shop/hours';
import { listOrders, toAdminOrderView, type AdminOrderView } from '@/domains/admin/order-ops';
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

  let orders: AdminOrderView[] = [];
  let products: { id: string; name: string; category: string; priceCents: number; available: boolean }[] = [];
  let status = { open: false, manualClosed: false };

  try {
    const [dbOrders, dbProducts, dbStatus] = await Promise.all([
      listOrders(),
      prisma.product.findMany({
        orderBy: [{ category: { sort: 'asc' } }, { sort: 'asc' }],
        include: { category: { select: { name: true } } },
      }),
      shopStatus(),
    ]);
    orders = dbOrders.map(toAdminOrderView);
    products = dbProducts.map((p) => ({ id: p.id, name: p.name, category: p.category.name, priceCents: p.priceCents, available: p.available }));
    status = dbStatus;
  } catch (err) {
    console.error('[AdminPage] Error loading admin data:', err);
  }

  // Só o horário: o encerramento manual é mostrado pelo próprio controlo.
  const statusLabel = withinOpeningHours() ? 'dentro do horário (fecha às 00h00)' : 'fora do horário (abre às 06h30)';

  return (
    <div className="container-app py-6 sm:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Painel de gestão</h1>
      <AdminNav active="orders" />

      <AdminOrders initial={orders} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ShopControls initialClosed={status.manualClosed} statusLabel={statusLabel} />
        <ProductAvailability initial={products} />
      </div>
    </div>
  );
}
