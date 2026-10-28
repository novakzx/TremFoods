import { NextResponse } from 'next/server';
import { requireUser } from '@/domains/account/session';
import { listOrders, toAdminOrderView } from '@/domains/admin/order-ops';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });

  const status = new URL(req.url).searchParams.get('status') ?? undefined;
  const orders = await listOrders(status);
  return NextResponse.json({ orders: orders.map(toAdminOrderView) });
}
