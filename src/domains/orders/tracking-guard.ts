import { attemptsIn, recordAttempt } from '@/infra/throttle';

// O acompanhamento público usa número do pedido (sequencial) + 4 dígitos do
// telefone: só 10 000 combinações. Contamos as tentativas ERRADAS por pedido
// (não por IP), o que trava também ataques distribuídos por muitos IPs.
const MAX_FAILS = 10;
const WINDOW_MS = 60 * 60 * 1000;

const key = (orderNumber: string) => `track-fail:${orderNumber}`;

export function trackingLocked(orderNumber: string) {
  return attemptsIn(key(orderNumber), WINDOW_MS) >= MAX_FAILS;
}

export function recordTrackingFailure(orderNumber: string) {
  recordAttempt(key(orderNumber));
}

export function phoneMatches(customerPhone: string | null | undefined, code: string) {
  return /^\d{4}$/.test(code) && Boolean(customerPhone?.replace(/\D/g, '').endsWith(code));
}
