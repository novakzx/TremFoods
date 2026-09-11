import { NextResponse } from 'next/server';
import { requireUser } from '@/domains/account/session';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true, user: { select: { email: true } } },
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      statusLabel: LIFECYCLE[o.status]?.label ?? o.status,
      paymentMethod: o.paymentMethod,
      paymentLabel: paymentMethodLabel(o.paymentMethod),
      paymentStatus: o.paymentStatus,
      deliveryMethod: o.deliveryMethod,
      totalCents: o.totalCents,
      totalLabel: eur(o.totalCents),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail ?? o.user.email,
      note: o.note,
      address: o.deliveryMethod === 'DELIVERY'
        ? [o.addressStreet, o.addressNumber, o.addressCity, o.addressPostal].filter(Boolean).join(', ')
        : 'Retirada no balcão',
      itemsCount: o.items.reduce((s, i) => s + i.qty, 0),
      createdAt: o.createdAt,
    })),
  });
}
