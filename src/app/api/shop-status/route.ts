import { NextResponse } from 'next/server';
import { shopStatus } from '@/domains/shop/shop-policy';
import { OPENING_HOURS_LABEL } from '@/domains/shop/hours';

export const dynamic = 'force-dynamic';

// Estado da loja para a UI (checkout, faixa de horário). Público — sem dados sensíveis.
export async function GET() {
  const status = await shopStatus();
  return NextResponse.json({ hoursLabel: OPENING_HOURS_LABEL, ...status });
}
