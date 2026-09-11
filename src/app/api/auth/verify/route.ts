import { NextResponse } from 'next/server';
import { hashToken } from '@/domains/account/session';
import { audit } from '@/infra/logging';
import { prisma } from '@/infra/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Link de verificação inválido.' } }, { status: 400 });

  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'EMAIL_VERIFY' || record.expiresAt < new Date() || record.usedAt) {
    return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Este link de verificação é inválido ou expirou.' } }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await audit('auth.email.verified', req, record.userId);
  return NextResponse.json({ ok: true });
}
