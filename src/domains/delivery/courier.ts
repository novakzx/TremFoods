import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/infra/db';

// O estafeta não precisa de conta: cada entrega tem um link secreto próprio
// (/estafeta/<token>), criado quando o pedido sai da cozinha e apagado quando
// a entrega termina — tal como a última posição (minimização de dados).

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export function newCourierToken() {
  return randomBytes(24).toString('base64url');
}

export function courierPath(token: string) {
  return `/estafeta/${token}`;
}

/** Pedido de uma entrega em curso pelo link do estafeta (ou null). */
export function findCourierOrder(token: string) {
  if (!TOKEN_RE.test(token)) return Promise.resolve(null);
  return prisma.order.findFirst({ where: { courierToken: token }, include: { items: true } });
}

export const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
});

export async function recordCourierPosition(token: string, pos: z.infer<typeof positionSchema>) {
  if (!TOKEN_RE.test(token)) return false;
  const { count } = await prisma.order.updateMany({
    where: { courierToken: token, status: 'OUT_FOR_DELIVERY' },
    data: { courierLat: pos.lat, courierLng: pos.lng, courierAccuracy: pos.accuracy ?? null, courierAt: new Date() },
  });
  return count > 0;
}

export type CourierPosition = { lat: number; lng: number; accuracy: number | null; at: string } | null;

// O que o cliente vê: só a posição, e só enquanto o pedido está a caminho.
export function courierPositionOf(order: {
  status: string;
  deliveryMethod: string;
  courierLat: number | null;
  courierLng: number | null;
  courierAccuracy: number | null;
  courierAt: Date | null;
}): CourierPosition {
  if (order.status !== 'OUT_FOR_DELIVERY' || order.deliveryMethod !== 'DELIVERY') return null;
  if (order.courierLat == null || order.courierLng == null || !order.courierAt) return null;
  return { lat: order.courierLat, lng: order.courierLng, accuracy: order.courierAccuracy, at: order.courierAt.toISOString() };
}
