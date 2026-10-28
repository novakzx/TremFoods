import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { requireUser } from '@/domains/account/session';
import { statusLabel } from '@/domains/orders/order-status';
import { eur, dateTimePT } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Os meus pedidos',
  description: 'Histórico dos seus pedidos na Trem Food, com estado em tempo real.',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const { user } = await requireUser();
  if (!user) redirect('/login?next=/pedidos');

  const orders = await prisma.order
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: { select: { qty: true } } },
    })
    .catch((err) => {
      console.error('[OrdersPage] Error loading orders:', err);
      return [];
    });

  return (
    <div className="container-app max-w-2xl py-6 sm:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Os meus pedidos</h1>

      {orders.length === 0 ? (
        <div className="card mt-5 p-8 text-center">
          <p className="font-display text-lg font-bold">Ainda não tem pedidos</p>
          <p className="mt-1 text-sm text-muted">Os seus pedidos aparecem aqui, com o estado em tempo real.</p>
          <Link href="/cardapio" className="btn-primary mx-auto mt-5">Ver o cardápio</Link>
        </div>
      ) : (
        <ul className="card mt-5 divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/pedido/${o.number}`} className="flex items-center gap-3 p-4 hover:bg-paper">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{o.number}</span>
                    <span className={`chip px-2 py-0.5 ${o.status === 'DELIVERED' ? 'bg-success/10 text-success' : o.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-deep'}`}>
                      {statusLabel(o.status, o.deliveryMethod)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {dateTimePT(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} artigos · {o.deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'}
                  </p>
                </div>
                <span className="font-semibold">{eur(o.totalCents)}</span>
                <ChevronRight className="h-4 w-4 flex-none text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
