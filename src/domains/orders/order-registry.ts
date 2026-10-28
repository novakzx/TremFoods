import { prisma } from '@/infra/db';

// Emissão sequencial do número de pedido dentro de uma transação: dois pedidos
// simultâneos nunca recebem o mesmo número (UPDATE ... RETURNING).
export async function nextOrderNumber(): Promise<string> {
  // Cria o contador se ainda não existir (BD sem seed) em vez de repetir TF-000001.
  const result = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" (id, value) VALUES (1, 1)
    ON CONFLICT (id) DO UPDATE SET value = "Counter".value + 1
    RETURNING value;
  `;
  const value = Number(result[0].value);
  return `TF-${String(value).padStart(6, '0')}`;
}
