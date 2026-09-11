import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { moveOrderStatus } from '@/domains/admin/order-ops';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { adminStatusSchema } from '@/domains/orders/validators';
import { prisma } from '@/infra/db';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });

  const body = await parseJson(req);
  const parsed = adminStatusSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { status } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, number: true, status: true },
  });
  if (!order) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } }, { status: 404 });

  const outcome = await moveOrderStatus(order.id, status);
  if (!outcome.ok) {
    const message = outcome.code === 'INVALID_TRANSITION' ? 'Transição de estado inválida.' : 'Pedido não encontrado.';
    const httpStatus = outcome.code === 'INVALID_TRANSITION' ? 400 : 404;
    return NextResponse.json({ error: { code: outcome.code, message } }, { status: httpStatus });
  }
  await audit('admin.order.status', req, user.id, user.email, { orderId: order.id, number: order.number, from: order.status, to: status });
  log('info', 'admin.order.status.changed', { orderId: order.id, to: status });
  return NextResponse.json({ ok: true, status });
}
