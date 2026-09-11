import { log } from './logging';

/**
 * Rate limiting por janela deslizante — implementação em memória.
 *
 * Válida para deployments de instância única (dev, VPS mono-instância).
 * Em produção multi-instância (Vercel/scale-out) o estado deve viver num
 * armazenamento partilhado (ex.: Upstash Redis REST, que funciona no Edge).
 * Para o fazer, implemente a mesma interface abaixo com chamadas REST ao
 * Redis — a API de `rateLimit()` não precisa de mudar.
 */

type Bucket = { timestamps: number[] };

const memory = new Map<string, Bucket>();

// Limpeza periódica para evitar crescimento infinito do mapa.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of memory) {
    b.timestamps = b.timestamps.filter((t) => now - t < 15 * 60_000);
    if (b.timestamps.length === 0) memory.delete(k);
  }
}, 10 * 60_000).unref?.();

function memoryCheck(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const bucket = memory.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= max) {
    memory.set(key, bucket);
    const retryAfter = Math.ceil((bucket.timestamps[0] + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }
  bucket.timestamps.push(now);
  memory.set(key, bucket);
  return { allowed: true, remaining: max - bucket.timestamps.length, retryAfter: 0 };
}

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  return memoryCheck(key, max, windowMs);
}

export function clientKey(req: Request, suffix = '') {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `${ip}:${suffix}`;
}

export function logRateLimit(key: string) {
  log('warn', 'rate-limit.blocked', { key });
}
