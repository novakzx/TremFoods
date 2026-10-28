import { NextResponse } from 'next/server';
import { verifyCsrf } from '@/domains/account/session';
import { findCourierOrder } from '@/domains/delivery/courier';
import { moveOrderStatus } from '@/domains/admin/order-ops';
import { audit } from '@/infra/logging';

export const dynamic = 'force-dynamic';

// O estafeta confirma a entrega no próprio telemóvel (o link deixa de valer).
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const order = await findCourierOrder(params.token);
  if (!order || order.status !== 'OUT_FOR_DELIVERY') {
    return NextResponse.json({ error: { code: 'NOT_ACTIVE', message: 'Esta entrega já não está a caminho.' } }, { status: 410 });
  }
  const outcome = await moveOrderStatus(order.id, 'DELIVERED');
  if (!outcome.ok) return NextResponse.json({ error: { code: outcome.code, message: 'Não foi possível concluir a entrega.' } }, { status: 409 });
  await audit('courier.delivered', req, null, null, { orderId: order.id, number: order.number });
  return NextResponse.json({ ok: true });
}
