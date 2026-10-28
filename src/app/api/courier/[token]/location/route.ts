import { NextResponse } from 'next/server';
import { verifyCsrf } from '@/domains/account/session';
import { positionSchema, recordCourierPosition } from '@/domains/delivery/courier';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';

export const dynamic = 'force-dynamic';

// Posição enviada pelo telemóvel do estafeta (a cada ~10 s). O token secreto
// do link é a autorização: só serve para este pedido e só enquanto está a caminho.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const parsed = positionSchema.safeParse(await parseJson(req));
  if (!parsed.success) return VALIDATION_ERROR('Posição inválida.');
  if (!(await recordCourierPosition(params.token, parsed.data))) {
    return NextResponse.json({ error: { code: 'NOT_ACTIVE', message: 'Esta entrega já não está a caminho.' } }, { status: 410 });
  }
  return NextResponse.json({ ok: true });
}
