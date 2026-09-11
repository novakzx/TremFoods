import { prisma } from '@/infra/db';

// Emissão sequencial do número de pedido dentro de uma transação: dois pedidos
// simultâneos nunca recebem o mesmo número (UPDATE ... RETURNING).
export async function nextOrderNumber(): Promise<string> {
  const result = await prisma.$queryRaw<{ value: number }[]>`
    UPDATE "Counter" SET value = value + 1 WHERE id = 1 RETURNING value;
  `;
  const value = result[0]?.value ?? 1;
  return `TF-${String(value).padStart(6, '0')}`;
}
