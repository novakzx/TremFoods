import { prisma } from '@/infra/db';
import { TRANSITIONS, type OrderStage } from './lifecycle';

export { FLOW, LIFECYCLE, TRANSITIONS, statusLabel, type OrderStage } from './lifecycle';

export type AdvanceOutcome = { ok: true } | { ok: false; code: 'NOT_FOUND' | 'INVALID_TRANSITION' };

export async function safeAdvanceStatus(orderId: string, next: string): Promise<AdvanceOutcome> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, code: 'NOT_FOUND' };
  if (!(TRANSITIONS[order.status] ?? []).includes(next as OrderStage)) return { ok: false, code: 'INVALID_TRANSITION' };

  // Pedidos em dinheiro ficam pagos quando entregues — evita cobrança em aberto.
  const markPaid = next === 'DELIVERED' && order.paymentMethod === 'CASH';
  const moved = await prisma.$transaction(async (tx) => {
    // Condicional ao estado lido: dois cliques/abas em simultâneo não duplicam a transição.
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: next, ...(markPaid ? { paymentStatus: 'PAID' } : {}) },
    });
    if (count === 0) return false;
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: next } });
    return true;
  });
  return moved ? { ok: true } : { ok: false, code: 'INVALID_TRANSITION' };
}
