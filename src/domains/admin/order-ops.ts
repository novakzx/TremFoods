import { prisma } from '@/infra/db';
import { safeAdvanceStatus } from '@/domains/orders/order-status';
import { statusLabel } from '@/domains/orders/order-status';
import { notifyOrderStatus } from '@/domains/notifications/push-server';

// Lista de trabalho do balcão: até 100 pedidos recentes, com filtro opcional por estado.
export function listOrders(status?: string) {
  return prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    include: { items: true, user: { select: { email: true } } },
  });
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
