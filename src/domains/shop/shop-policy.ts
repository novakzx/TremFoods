import { prisma } from '@/infra/db';
import { withinOpeningHours } from './hours';

// Interrutor manual (férias, avaria) — gerido no painel admin.
const CLOSED_KEY = 'storeClosed';

export async function storeClosed() {
  const row = await prisma.setting.findUnique({ where: { key: CLOSED_KEY } });
  return row?.value === 'true';
}

export async function setStoreClosed(closed: boolean) {
  await prisma.setting.upsert({
    where: { key: CLOSED_KEY },
    update: { value: closed ? 'true' : 'false' },
    create: { key: CLOSED_KEY, value: closed ? 'true' : 'false' },
  });
}

// Motivo pelo qual o checkout recusa pedidos, ou null se aceita.
export async function orderBlockReason(now = new Date()): Promise<'HOURS' | 'MANUAL' | null> {
  if (process.env.SHOP_OPEN_OVERRIDE === '1') return null; // override só para testes E2E
  if (!withinOpeningHours(now)) return 'HOURS';
  if (await storeClosed()) return 'MANUAL';
  return null;
}

export async function shopStatus(now = new Date()) {
  const manualClosed = await storeClosed();
  return {
    open: process.env.SHOP_OPEN_OVERRIDE === '1' ? true : withinOpeningHours(now) && !manualClosed,
    manualClosed,
  };
}
