import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientKey } from '@/infra/throttle';

// Limites por grupo de rotas (janela deslizante). Os limites apertados só
// contam pedidos que alteram estado (POST/PATCH/PUT/DELETE): a sondagem do
// estado de um pedido (GET a cada 20 s) não pode esgotar o limite de checkout.
const STRICT: { prefix: string; max: number; windowMs: number }[] = [
  { prefix: '/api/auth/login', max: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/register', max: 6, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/auth/forgot', max: 5, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/auth/reset', max: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/resend-verification', max: 5, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/orders', max: 12, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/payments/stripe', max: 20, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/push/subscribe', max: 20, windowMs: 60 * 60 * 1000 },
];
const GENERAL = { prefix: '/api/', max: 180, windowMs: 60 * 1000 };

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);

  const path = req.nextUrl.pathname;
  // O webhook do Stripe é autenticado pela assinatura e pode chegar em rajadas.
  if (!path.startsWith('/api/') || path.startsWith('/api/payments/stripe/webhook')) return res;

  const strict = MUTATING.has(req.method) ? STRICT.find((l) => path === l.prefix || path.startsWith(`${l.prefix}/`)) : undefined;
  const limit = strict ?? GENERAL;

  const result = await rateLimit(clientKey(req, `${limit.prefix}:${strict ? 'w' : 'r'}`), limit.max, limit.windowMs);
  res.headers.set('x-ratelimit-remaining', String(result.remaining));
  if (!result.allowed) {
    return new NextResponse(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Demasiadas tentativas. Tente novamente mais tarde.' } }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'x-request-id': requestId, 'retry-after': String(result.retryAfter) },
    });
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
