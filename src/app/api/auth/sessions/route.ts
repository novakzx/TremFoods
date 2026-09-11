import { NextResponse } from 'next/server';
import { requireUser, verifyCsrf, hashToken, secrets, cookieOptions } from '@/domains/account/session';
import { audit } from '@/infra/logging';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

function deviceLabel(ua: string | null) {
  if (!ua) return 'Dispositivo desconhecido';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Navegador';
}

export async function GET(req: Request) {
  const { session, user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  const rows = await prisma.session.findMany({ where: { userId: user.id }, orderBy: { lastSeen: 'desc' } });
  const currentHash = session ? hashToken(req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${secrets.SESSION_COOKIE}=([^;]+)`))?.[1] ?? '') : '';
  return NextResponse.json({
    sessions: rows.map((s) => ({
      id: s.id,
      device: deviceLabel(s.userAgent),
      ip: s.ip,
      lastSeen: s.lastSeen,
      expiresAt: s.expiresAt,
      current: s.tokenHash === currentHash,
    })),
  });
}

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { session, user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });

  // "Sair de todos os dispositivos" — o corpo { all: true } revoga tudo (incl. atual)
  const body = (await req.json().catch(() => ({}))) as { all?: boolean; exceptCurrent?: boolean };
  const currentHash = session ? hashToken(req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${secrets.SESSION_COOKIE}=([^;]+)`))?.[1] ?? '') : undefined;
  if (body.all) {
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
  } else {
    await prisma.session.updateMany({ where: { userId: user.id, tokenHash: { not: currentHash ?? '' } }, data: { expiresAt: new Date(0) } });
  }
  await audit('auth.sessions.revoked', req, user.id, user.email, { all: !!body.all });
  const res = NextResponse.json({ ok: true });
  if (body.all) res.cookies.set(secrets.SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return res;
}
