// Regras comerciais de entrega/levantamento — única fonte de verdade.
export const DELIVERY_FEE_CENTS = 250;
export const FREE_DELIVERY_FROM_CENTS = 2500;
export const PICKUP_MINUTES = 20;
export const DELIVERY_MINUTES = 40;

// Tempo estimado conforme a fila da cozinha: a chapa despacha
// KITCHEN_PARALLEL_ORDERS pedidos ao mesmo tempo sem atrasar; cada pedido a
// mais à frente soma MINUTES_PER_QUEUED_ORDER. A cozinha pode ainda somar
// minutos à mão quando está cheia (EXTRA_MINUTES_OPTIONS).
export const KITCHEN_PARALLEL_ORDERS = 2;
export const MINUTES_PER_QUEUED_ORDER = 5;
export const EXTRA_MINUTES_OPTIONS = [0, 10, 20, 30] as const;
const MAX_QUEUE_DELAY_MINUTES = 60;

export function deliveryFeeFor(subtotalCents: number, deliveryMethod: string) {
  if (deliveryMethod === 'PICKUP') return 0;
  return subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : DELIVERY_FEE_CENTS;
}

/** Minutos até o pedido estar pronto (levantamento) ou entregue, com `queueAhead`
 *  pedidos já na cozinha (recebidos ou em preparação). Arredonda a 5 min. */
export function etaFor(deliveryMethod: string, queueAhead: number, extraMinutes = 0) {
  const base = deliveryMethod === 'PICKUP' ? PICKUP_MINUTES : DELIVERY_MINUTES;
  const waiting = Math.max(0, queueAhead - (KITCHEN_PARALLEL_ORDERS - 1));
  const delay = Math.min(waiting * MINUTES_PER_QUEUED_ORDER, MAX_QUEUE_DELAY_MINUTES) + Math.max(0, extraMinutes);
  return Math.ceil((base + delay) / 5) * 5;
}
