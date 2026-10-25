import { NextResponse } from 'next/server';
import { issueSession, cookieOptions, secrets, verifyCsrf, readBasketToken, persistBasketCookie } from '@/domains/account/session';
import { absorbGuestBasket } from '@/domains/basket/basket-store';
import { verifyPassword } from '@/domains/account/credentials';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, logValidation } from '@/infra/logging';
import { attemptsIn, recordAttempt } from '@/infra/throttle';
import { loginSchema } from '@/domains/account/validators';
import { prisma } from '@/infra/db';

// Hash bcrypt (custo 12) de uma palavra-passe aleatória: comparar contra ele
// quando o e-mail não existe iguala o tempo de resposta (sem enumeração de contas).
const DUMMY_HASH = '$2a$12$LtWHzG6ZbDutpr0iG/50..DG5EMdASlImyauDwo2NCoIhwMha/CNK';

const LEAKED_DEFAULT_PASSWORD = 'TrocarAdmin2026';

// Bloqueio por conta: trava ataques distribuídos (muitos IPs, mesma conta).
const ACCOUNT_MAX_FAILS = 8;
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });

  const body = await parseJson(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR('E-mail ou palavra-passe inválidos.');
  }
  const { email, password } = parsed.data;

  const failKey = `login-fail:${email}`;
  if (attemptsIn(failKey, ACCOUNT_WINDOW_MS) >= ACCOUNT_MAX_FAILS) {
    return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Demasiadas tentativas para esta conta. Tente novamente dentro de 15 minutos.' } }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordAttempt(failKey);
    await audit('auth.login.failed', req, user?.id, email);
    return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou palavra-passe incorretos.' } }, { status: 401 });
  }

  // Senha por omissão que esteve publicada no repositório: nunca abre sessão.
  if (password === LEAKED_DEFAULT_PASSWORD) {
    await audit('auth.login.leaked_password', req, user.id, email);
    return NextResponse.json({ error: { code: 'PASSWORD_RESET_REQUIRED', message: 'Esta palavra-passe deixou de ser aceite por segurança. Defina uma nova em "Esqueci-me da palavra-passe".' } }, { status: 403 });
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
