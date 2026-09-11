import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { verifyCsrf } from '@/domains/account/session';
import { sendMail, resetPasswordHtml } from '@/domains/comms/mailer';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { mailConfigured } from '@/infra/config';
import { audit, logValidation } from '@/infra/logging';
import { forgotSchema } from '@/domains/account/validators';
import { prisma } from '@/infra/db';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { email } = parsed.data;

  // Resposta uniforme: não revela se o e-mail existe.
  const user = await prisma.user.findUnique({ where: { email } });
  let devResetLink: string | undefined;
  if (user) {
    const token = randomBytes(32).toString('base64url');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/redefinir-password?token=${token}`;
    await sendMail(email, 'Redefinir palavra-passe', resetPasswordHtml(link), `Redefinir palavra-passe: ${link}`);
    await audit('auth.forgot', req, user.id, email);
    devResetLink = link;
  }
  return NextResponse.json({
    ok: true,
    ...(!mailConfigured && user ? { devResetLink } : {}),
  });
}
