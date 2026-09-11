import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { issueSession, cookieOptions, secrets, verifyCsrf } from '@/domains/account/session';
import { sendMail, verifyEmailHtml } from '@/domains/comms/mailer';
import { hashPassword } from '@/domains/account/credentials';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { mailConfigured } from '@/infra/config';
import { audit, logValidation } from '@/infra/logging';
import { registerSchema } from '@/domains/account/validators';
import { prisma } from '@/infra/db';

const TOKEN_TTL = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });

  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await audit('auth.register.duplicate', req);
    return NextResponse.json({ error: { code: 'EMAIL_EXISTS', message: 'Já existe uma conta com este e-mail. Inicie sessão.' } }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  const token = randomBytes(32).toString('base64url');
  await prisma.verificationToken.create({
    data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), type: 'EMAIL_VERIFY', expiresAt: new Date(Date.now() + TOKEN_TTL) },
  });

  const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/verificar-email?token=${token}`;
  await sendMail(email, 'Confirme o seu e-mail', verifyEmailHtml(link), `Confirme o seu e-mail: ${link}`);
  await audit('auth.register', req, user.id, email);

  const sessionToken = await issueSession(user.id, req);
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: false },
    // Em dev o SMTP não está configurado: devolvemos o link para testes locais.
    ...(!mailConfigured ? { devVerifyLink: link } : {}),
  }, { status: 201 });
  res.cookies.set(secrets.SESSION_COOKIE, sessionToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
