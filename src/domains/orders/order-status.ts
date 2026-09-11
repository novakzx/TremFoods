import { prisma } from '@/infra/db';

// Máquina de estados do pedido: o índice `order` é a posição no fluxo e
// impede transições para trás (ex.: voltar de "Entregue" para "Em preparação").
export type OrderStage = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export const FLOW: readonly OrderStage[] = ['RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const LIFECYCLE: Record<string, { label: string; pickupLabel?: string; order: number }> = {
  RECEIVED: { label: 'Pedido recebido', order: 0 },
  PREPARING: { label: 'Em preparação', order: 1 },
  OUT_FOR_DELIVERY: { label: 'Saiu para entrega', pickupLabel: 'Pronto para levantamento', order: 2 },
  DELIVERED: { label: 'Entregue', pickupLabel: 'Concluído', order: 3 },
  CANCELLED: { label: 'Cancelado', order: 9 },
};

export function statusLabel(status: string, deliveryMethod?: string) {
  const meta = LIFECYCLE[status];
  if (!meta) return status;
  if (deliveryMethod === 'PICKUP' && meta.pickupLabel) return meta.pickupLabel;
  return meta.label;
}

export type AdvanceOutcome = { ok: true } | { ok: false; code: 'NOT_FOUND' | 'INVALID_TRANSITION' };

export async function safeAdvanceStatus(orderId: string, next: string): Promise<AdvanceOutcome> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, code: 'NOT_FOUND' };

  const current = LIFECYCLE[order.status]?.order ?? 0;
  const target = LIFECYCLE[next]?.order ?? 0;
  if (target < current) return { ok: false, code: 'INVALID_TRANSITION' };

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: next } }),
    prisma.orderStatusEvent.create({ data: { orderId: order.id, status: next } }),
  ]);
  // Pedidos em dinheiro ficam pagos quando entregues — evita cobrança em aberto.
  if (next === 'DELIVERED' && order.paymentMethod === 'CASH') {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } });
  }
  return { ok: true };
}
