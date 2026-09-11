import { NextResponse } from 'next/server';
import { issueCsrf } from '@/domains/account/session';

// Rota forçosamente dinâmica: sem isto, o Next pré-renderiza o handler e o
// token/`set-cookie` ficam fixos (e servidos de cache — a CDN pode nem
// devolver o cookie → login falha com "Token de segurança inválido").
export const dynamic = 'force-dynamic';

export async function GET() {
  const { token, cookie } = issueCsrf();
  const res = NextResponse.json({ csrfToken: token });
  res.headers.set('set-cookie', cookie);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
}
