import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { requireUser, verifyCsrf } from '@/domains/account/session';
import { sendMail, verifyEmailHtml } from '@/domains/comms/mailer';
import { mailConfigured } from '@/infra/config';
import { prisma } from '@/infra/db';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = randomBytes(32).toString('base64url');
  await prisma.verificationToken.create({
    data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), type: 'EMAIL_VERIFY', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/verificar-email?token=${token}`;
  await sendMail(user.email, 'Confirme o seu e-mail', verifyEmailHtml(link), `Confirme o seu e-mail: ${link}`);
  return NextResponse.json({ ok: true, ...(!mailConfigured ? { devVerifyLink: link } : {}) });
}
