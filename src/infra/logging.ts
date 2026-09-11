import { prisma } from '@/infra/db';

// Log estruturado JSON (stdout) — pronto para agregadores (Vercel, Datadog, Loki…).
export function log(level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export function requestId(req?: Request) {
  return req?.headers.get('x-request-id') ?? 'n/a';
}

export async function audit(action: string, req: Request | null, actorId?: string | null, actorEmail?: string | null, meta: Record<string, unknown> = {}) {
  const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  try {
    await prisma.auditLog.create({
      data: { action, actorId: actorId ?? null, actorEmail: actorEmail ?? null, ip, meta: meta as object },
    });
  } catch (e) {
    log('error', 'audit.write.failed', { action, error: (e as Error).message });
  }
}

/** Wrapper de route handler: erros inesperados viram 500 genericos sem vazar stack. */
export function handler<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  return async (...args: Args): Promise<R> => {
    try {
      return await fn(...args);
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      log('error', 'api.error', { message: err.message, stack: err.stack?.slice(0, 600) });
      if (err.code === 'RATE_LIMIT') {
        return { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Demasiadas tentativas. Tente novamente mais tarde.' } } } as unknown as R;
      }
      return { status: err.status ?? 500, body: { error: { code: 'INTERNAL', message: 'Ocorreu um erro inesperado.' } } } as unknown as R;
    }
  };
}

export function logValidation(error: { issues: { message: string }[] }) {
  log('warn', 'validation.failed', { detail: error.issues.map((i) => i.message).join(' • ') });
}
