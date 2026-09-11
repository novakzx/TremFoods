import { NextResponse } from 'next/server';

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(code: string, message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export const UNAUTHORIZED = () => jsonError('UNAUTHORIZED', 'Sessão inválida. Inicie sessão novamente.', 401);
export const FORBIDDEN = () => jsonError('FORBIDDEN', 'Não tem permissões para esta ação.', 403);
export const VALIDATION_ERROR = (message: string) => jsonError('VALIDATION', message, 422);

export async function parseJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
