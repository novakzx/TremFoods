import { prisma } from '@/infra/db';
import { safeAdvanceStatus, statusLabel, LIFECYCLE } from '@/domains/orders/order-status';
import { notifyOrderStatus } from '@/domains/notifications/push-server';
import { courierPath } from '@/domains/delivery/courier';

// Lista de trabalho do balcão: até 100 pedidos recentes, com filtro opcional por estado.
export function listOrders(status?: string) {
  return prisma.order.findMany({
    where: status && LIFECYCLE[status] ? { status } : undefined,
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    include: { items: true, user: { select: { email: true } } },
  });
}

type ListedOrder = Awaited<ReturnType<typeof listOrders>>[number];

export type AdminOrderView = {
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

// Formato único para o painel (render inicial e atualização periódica).
export function toAdminOrderView(o: ListedOrder): AdminOrderView {
  return {
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
    items: o.items.map((i) => ({
      name: i.nameSnapshot,
      qty: i.qty,
      options: Array.isArray(i.optionsJson) ? (i.optionsJson as { name: string }[]).map((x) => x.name) : [],
    })),
    createdAt: o.createdAt.toISOString(),
  };
}

// Ecrã da cozinha: só pedidos em curso, do mais antigo para o mais recente.
export function listKitchenOrders() {
  return prisma.order.findMany({
    where: { status: { in: ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY'] } },
    orderBy: { createdAt: 'asc' },
    take: 60,
    include: { items: true, user: { select: { email: true } }, events: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
}

export type KitchenOrderView = AdminOrderView & {
  etaMinutes: number | null;
  statusSince: string;
  courierPath: string | null;
  courierSeenAt: string | null;
};

export function toKitchenOrderView(o: Awaited<ReturnType<typeof listKitchenOrders>>[number]): KitchenOrderView {
  return {
    ...toAdminOrderView(o),
    etaMinutes: o.etaMinutes,
    statusSince: (o.events[0]?.createdAt ?? o.createdAt).toISOString(),
    courierPath: o.status === 'OUT_FOR_DELIVERY' && o.courierToken ? courierPath(o.courierToken) : null,
    courierSeenAt: o.status === 'OUT_FOR_DELIVERY' && o.courierAt ? o.courierAt.toISOString() : null,
  };
}

export async function moveOrderStatus(orderId: string, next: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { number: true, deliveryMethod: true, status: true },
  });
  const outcome = await safeAdvanceStatus(orderId, next);
  if (outcome.ok && order) {
    void notifyOrderStatus(order.number, `Pedido ${order.number}`, statusLabel(next, order.deliveryMethod), `/rastreamento?number=${encodeURIComponent(order.number)}`);
  }
  return outcome;
}
