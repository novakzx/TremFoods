import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/infra/db';
import { clientIp } from '@/infra/throttle';

const SESSION_COOKIE = 'trem_session';
const CSRF_COOKIE = 'trem_csrf';
const CART_COOKIE = 'trem_cart';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const ROLLING_AFTER_MS = 1000 * 60 * 60 * 24 * 15; // renova após 15 dias

export const cookieOptions = {
  httpOnly: true,
  secure: isSecureEnv(),
  sameSite: 'lax' as const,
  path: '/',
};

function isSecureEnv() {
  return process.env.NODE_ENV === 'production';
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/* ---------------- Sessões ---------------- */

export async function issueSession(userId: string, req: Request | null) {
  const token = randomBytes(32).toString('base64url');
  const ip = req ? clientIp(req) : null;
  const ua = req ? req.headers.get('user-agent')?.slice(0, 255) ?? null : null;
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS), ip, userAgent: ua },
  });
  return token;
}

export async function getSessionUser() {
  try {
    const store = cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    // rolling: prolonga sessões ativas
    if (Date.now() - session.lastSeen.getTime() > ROLLING_AFTER_MS) {
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await prisma.session.update({ where: { id: session.id }, data: { expiresAt, lastSeen: new Date() } }).catch(() => {});
      return { ...session, expiresAt };
    }
    return session;
  } catch (err) {
    console.error('[Session] getSessionUser error:', err);
    return null;
  }
}

export async function requireUser() {
  try {
    const session = await getSessionUser();
    if (!session) return { session: null, user: null };
    return { session, user: session.user };
  } catch (err) {
    console.error('[Session] requireUser error:', err);
    return { session: null, user: null };
  }
}

export async function destroySession(token: string) {
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } });
}

export async function revokeAllSessions(userId: string, exceptTokenHash?: string) {
  await prisma.session.updateMany({
    where: { userId, ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}) },
    data: { expiresAt: new Date(0) },
  });
}

/** Lê um cookie do cabeçalho do pedido (route handlers recebem `Request`). */
export function readCookie(req: Request, name: string) {
  return req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] ?? null;
}

/* ---------------- CSRF (double-submit) ---------------- */

const CSRF_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

// O token chega ao cliente pelo corpo JSON de /api/auth/csrf (outra origem não o
// consegue ler); o cookie é HttpOnly. Reutiliza o token existente para que
// vários separadores abertos não se invalidem uns aos outros.
export function issueCsrf(req: Request) {
  const existing = readCookie(req, CSRF_COOKIE);
  const token = existing && CSRF_TOKEN_RE.test(existing) ? existing : randomBytes(24).toString('base64url');
  return { token, cookie: `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; HttpOnly${isSecureEnv() ? '; Secure' : ''}` };
}

export function verifyCsrf(req: Request) {
  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}

export function sessionTokenFrom(req: Request) {
  return readCookie(req, SESSION_COOKIE);
}

/* ---------------- Cart (sessão anónima por cookie) ---------------- */

export function newBasketToken() {
  const store = cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing && existing.length >= 32) return existing;
  return randomBytes(24).toString('base64url');
}

export function persistBasketCookie(res: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } }, value: string) {
  res.cookies.set(CART_COOKIE, value, { ...cookieOptions, maxAge: 60 * 60 * 24 * 90 });
}

export function readBasketToken(req: Request) {
  return readCookie(req, CART_COOKIE);
}

export const secrets = { SESSION_COOKIE, CSRF_COOKIE, CART_COOKIE };
