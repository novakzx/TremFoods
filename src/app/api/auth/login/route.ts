import { NextResponse } from 'next/server';
import { issueSession, cookieOptions, secrets, verifyCsrf, readBasketToken, persistBasketCookie } from '@/domains/account/session';
import { absorbGuestBasket } from '@/domains/basket/basket-store';
import { verifyPassword } from '@/domains/account/credentials';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, logValidation } from '@/infra/logging';
import { loginSchema } from '@/domains/account/validators';
import { prisma } from '@/infra/db';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });

  const body = await parseJson(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR('E-mail ou palavra-passe inválidos.');
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    await audit('auth.login.failed', req, user?.id, email);
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou palavra-passe incorretos.' } }, { status: 401 });
  }

  const sessionToken = await issueSession(user.id, req);
  const cartToken = readBasketToken(req);
  await absorbGuestBasket(user.id, cartToken);
  await audit('auth.login', req, user.id, email);

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: !!user.emailVerifiedAt },
  });
  res.cookies.set(secrets.SESSION_COOKIE, sessionToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  if (cartToken) persistBasketCookie(res, cartToken);
  return res;
}
