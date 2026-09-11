import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyCsrf, hashToken } from '@/domains/account/session';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, logValidation } from '@/infra/logging';
import { resetSchema } from '@/domains/account/validators';
import { prisma } from '@/infra/db';

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { token, password } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== 'PASSWORD_RESET' || record.expiresAt < new Date() || record.usedAt) {
    return NextResponse.json({ error: { code: 'INVALID_TOKEN', message: 'Este link de recuperação é inválido ou expirou.' } }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // invalida todas as sessões: troca de credenciais = revogação
    prisma.session.updateMany({ where: { userId: record.userId }, data: { expiresAt: new Date(0) } }),
  ]);
  await audit('auth.password.reset', req, record.userId);
  return NextResponse.json({ ok: true });
}
