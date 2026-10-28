import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { listKitchenOrders, toKitchenOrderView } from '@/domains/admin/order-ops';
import { currentEta, setEtaExtraMinutes } from '@/domains/delivery/eta';
import { EXTRA_MINUTES_OPTIONS } from '@/domains/delivery/delivery-policy';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit } from '@/infra/logging';

export const dynamic = 'force-dynamic';

const FORBIDDEN = () => NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso restrito.' } }, { status: 403 });

// Estado do ecrã da cozinha. `serverTime` permite ao tablet calcular os
// cronómetros mesmo com o relógio do dispositivo desacertado.
export async function GET() {
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') return FORBIDDEN();
  const [orders, eta] = await Promise.all([listKitchenOrders(), currentEta()]);
  return NextResponse.json({ serverTime: new Date().toISOString(), eta, orders: orders.map(toKitchenOrderView) });
}

const patchSchema = z.object({
  extraMinutes: z.number().int().refine((v) => (EXTRA_MINUTES_OPTIONS as readonly number[]).includes(v), 'Valor inválido.'),
});

// "Estamos cheios": minutos somados ao tempo previsto de todos os pedidos novos.
export async function PATCH(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user || user.role !== 'ADMIN') return FORBIDDEN();
  const parsed = patchSchema.safeParse(await parseJson(req));
  if (!parsed.success) return VALIDATION_ERROR('Valor inválido.');
  await setEtaExtraMinutes(parsed.data.extraMinutes);
  await audit('admin.kitchen.extra_minutes', req, user.id, user.email, { extraMinutes: parsed.data.extraMinutes });
  return NextResponse.json({ ok: true, eta: await currentEta() });
}
