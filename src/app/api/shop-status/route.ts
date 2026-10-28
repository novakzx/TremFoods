import { NextResponse } from 'next/server';
import { shopStatus } from '@/domains/shop/shop-policy';
import { OPENING_HOURS_LABEL } from '@/domains/shop/hours';
import { currentEta } from '@/domains/delivery/eta';

export const dynamic = 'force-dynamic';

// Estado da loja para a UI (checkout, faixa de horário). Público — sem dados
// sensíveis: só os minutos previstos, nunca quantos pedidos há na fila.
export async function GET() {
  const [status, eta] = await Promise.all([shopStatus(), currentEta()]);
  return NextResponse.json({
    hoursLabel: OPENING_HOURS_LABEL,
    ...status,
    eta: status.open ? { delivery: eta.delivery, pickup: eta.pickup } : null,
  });
}
