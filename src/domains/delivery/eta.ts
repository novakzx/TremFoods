import { prisma } from '@/infra/db';
import { EXTRA_MINUTES_OPTIONS, etaFor } from './delivery-policy';

// Minutos extra definidos pela cozinha no ecrã ("estamos cheios: +10 min").
const EXTRA_KEY = 'etaExtraMinutes';

export async function etaExtraMinutes(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: EXTRA_KEY } });
  const value = Number(row?.value ?? 0);
  return (EXTRA_MINUTES_OPTIONS as readonly number[]).includes(value) ? value : 0;
}

export async function setEtaExtraMinutes(minutes: number) {
  await prisma.setting.upsert({
    where: { key: EXTRA_KEY },
    update: { value: String(minutes) },
    create: { key: EXTRA_KEY, value: String(minutes) },
  });
}

/** Pedidos na cozinha agora (ainda não saíram) e o tempo estimado para um pedido novo. */
export async function currentEta() {
  const [queue, extraMinutes] = await Promise.all([
    prisma.order.count({ where: { status: { in: ['RECEIVED', 'PREPARING'] } } }),
    etaExtraMinutes(),
  ]);
  return {
    queue,
    extraMinutes,
    pickup: etaFor('PICKUP', queue, extraMinutes),
    delivery: etaFor('DELIVERY', queue, extraMinutes),
  };
}
