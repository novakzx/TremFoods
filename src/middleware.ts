import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientKey } from '@/infra/throttle';

// Limites por grupo de rotas (janela deslizante).
const LIMITS: { prefix: string; max: number; windowMs: number }[] = [
  { prefix: '/api/auth/login', max: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/register', max: 6, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/auth/forgot', max: 5, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/auth/reset', max: 10, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/orders', max: 12, windowMs: 60 * 60 * 1000 },
  { prefix: '/api/', max: 180, windowMs: 60 * 1000 },
];

export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);

  const path = req.nextUrl.pathname;
  if (!path.startsWith('/api/')) return res;

  const limit = LIMITS.find((l) => path.startsWith(l.prefix) && (l.prefix === '/api/' || l.prefix === path || (l.prefix !== '/api/' && !path.startsWith(l.prefix + '/sub')))) ?? LIMITS[LIMITS.length - 1];
  const match = LIMITS.find((l) => l.prefix !== '/api/' && path.startsWith(l.prefix)) ?? LIMITS[LIMITS.length - 1];

  const key = clientKey(req, path);
  const result = await rateLimit(key, match.max, match.windowMs);
  res.headers.set('x-ratelimit-remaining', String(result.remaining));
  if (!result.allowed) {
    res.headers.set('retry-after', String(result.retryAfter));
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
