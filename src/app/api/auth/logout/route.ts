import { NextResponse } from 'next/server';
import { secrets, cookieOptions, verifyCsrf, destroySession } from '@/domains/account/session';
import { audit } from '@/infra/logging';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const token = req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${secrets.SESSION_COOKIE}=([^;]+)`))?.[1] ?? null;
  if (token) await destroySession(token);
  await audit('auth.logout', req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(secrets.SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  res.cookies.set(secrets.CART_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
