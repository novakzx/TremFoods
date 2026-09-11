import { NextResponse } from 'next/server';
import { prisma } from '@/infra/db';
import { LIFECYCLE } from '@/domains/orders/order-status';

export const dynamic = 'force-dynamic';

/**
 * Acompanhamento público por número de pedido + 4 últimos dígitos do telefone.
 * O número por si só não expõe dados do pedido (proteção de privacidade).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get('number')?.trim().toUpperCase() ?? '';
  const code = url.searchParams.get('code')?.trim() ?? '';
  if (!number || !/^TF-\d{6}$/.test(number) || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Indique o número do pedido (TF-000000) e os 4 últimos dígitos do telefone.' } }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { number },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order || !order.customerPhone.endsWith(code)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado. Verifique os dados.' } }, { status: 404 });
  }
  return NextResponse.json({
    number: order.number,
    status: order.status,
    statusLabel: LIFECYCLE[order.status]?.label ?? order.status,
    deliveryMethod: order.deliveryMethod,
    estimatedMinutes: order.etaMinutes,
    events: order.events.map((e) => ({ status: e.status, label: LIFECYCLE[e.status]?.label ?? e.status, at: e.createdAt })),
  });
}
