// Regras comerciais de entrega/levantamento — única fonte de verdade.
export const DELIVERY_FEE_CENTS = 250;
export const FREE_DELIVERY_FROM_CENTS = 2500;
export const PICKUP_MINUTES = 20;
export const DELIVERY_MINUTES = 40;

export function deliveryFeeFor(subtotalCents: number, deliveryMethod: string) {
  if (deliveryMethod === 'PICKUP') return 0;
  return subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : DELIVERY_FEE_CENTS;
}
