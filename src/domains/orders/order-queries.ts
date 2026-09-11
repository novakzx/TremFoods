import { prisma } from '@/infra/db';

const DETAIL = { include: { items: true, events: { orderBy: { createdAt: 'asc' as const } } } } as const;

export function getForUser(number: string, userId: string) {
  return prisma.order.findFirst({ where: { number, userId }, ...DETAIL });
}

