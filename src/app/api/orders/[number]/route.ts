import { NextResponse } from 'next/server';
import { requireUser } from '@/domains/account/session';
import { getForUser } from '@/domains/orders/order-queries';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur } from '@/domains/shared-kernel/money';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { number: string } }) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  const order = await getForUser(params.number, user.id);
  if (!order) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } }, { status: 404 });
  return NextResponse.json({
    number: order.number,
    status: order.status,
    statusLabel: LIFECYCLE[order.status]?.label ?? order.status,
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    paymentLabel: paymentMethodLabel(order.paymentMethod),
    paymentStatus: order.paymentStatus,
    totalCents: order.totalCents,
    totalLabel: eur(order.totalCents),
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    etaMinutes: order.etaMinutes,
    note: order.note,
    paymentMeta: order.paymentMeta,
    address: order.deliveryMethod === 'DELIVERY'
      ? { street: order.addressStreet, number: order.addressNumber, city: order.addressCity, postal: order.addressPostal }
      : null,
    items: order.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty, priceCents: i.priceCents, options: Array.isArray(i.optionsJson) ? i.optionsJson : [] })),
    events: order.events.map((e) => ({ status: e.status, label: LIFECYCLE[e.status]?.label ?? e.status, note: e.note, at: e.createdAt })),
    createdAt: order.createdAt,
  });
}
