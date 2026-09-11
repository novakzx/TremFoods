export const PAYMENT_METHODS = ['CASH', 'CARD', 'MBWAY', 'MULTIBANCO'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CARD: 'Cartão',
  MBWAY: 'MB WAY',
  MULTIBANCO: 'Referência Multibanco',
};

export function paymentMethodLabel(method: string) {
  return LABELS[method] ?? method;
}
