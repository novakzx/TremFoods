import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Receipt, ChevronRight } from 'lucide-react';
import { requireUser } from '@/domains/account/session';
import { LIFECYCLE } from '@/domains/orders/order-status';
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

  let orders: any[] = [];
  try {
    orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: true },
    });
  } catch (err) {
    console.error('[OrdersPage] Error loading orders:', err);
    orders = [];
  }

  return (
    <div className="container-app max-w-3xl py-8 sm:py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Os meus pedidos</h1>
      <p className="mt-1.5 text-sm text-muted">Histórico dos últimos pedidos da sua conta.</p>

      {orders.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/40">
            <Receipt className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-lg font-bold">Ainda não tem pedidos</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">Quando fizer uma encomenda, ela aparece aqui com o estado em tempo real.</p>
          <Link href="/cardapio" className="btn-primary mx-auto mt-6">Ver o cardápio</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => {
            const meta = LIFECYCLE[o.status];
            return (
              <li key={o.id}>
                <Link href={`/pedido/${o.number}`} className="card group flex items-center gap-4 p-4 transition-colors hover:border-ink/30 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-display text-[15px] font-bold">{o.number}</span>
                      <span className={`chip text-xs font-bold ${o.status === 'DELIVERED' ? 'bg-success/10 text-success' : o.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-accent/15 text-accent-ink'}`}>
                        {meta?.label ?? o.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {dateTimePT(o.createdAt)} · {(o.items || []).reduce((s: number, i: any) => s + i.qty, 0)} artigos · {o.deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'}
                    </p>
                  </div>
                  <span className="flex-none text-right">
                    <span className="block font-display text-base font-extrabold">{eur(o.totalCents)}</span>
                    <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
