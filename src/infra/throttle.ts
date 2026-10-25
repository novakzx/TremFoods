// Sem dependências de servidor (Prisma, Node): também corre no middleware (Edge).

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
const MAX_WINDOW_MS = 60 * 60_000;

// Limpeza periódica para evitar crescimento infinito do mapa.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of memory) {
    b.timestamps = b.timestamps.filter((t) => now - t < MAX_WINDOW_MS);
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

/** Quantas tentativas já existem na janela, sem registar uma nova. */
export function attemptsIn(key: string, windowMs: number): number {
  const now = Date.now();
  return (memory.get(key)?.timestamps ?? []).filter((t) => now - t < windowMs).length;
}

/** Regista uma tentativa (ex.: código errado) sem verificar o limite. */
export function recordAttempt(key: string) {
  const bucket = memory.get(key) ?? { timestamps: [] };
  bucket.timestamps.push(Date.now());
  memory.set(key, bucket);
}

// IP do cliente. Na Vercel `x-real-ip`/`x-forwarded-for` são reescritos pela
// plataforma; atrás de outro proxy, configure-o para fazer o mesmo.
export function clientIp(req: Request) {
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function clientKey(req: Request, suffix = '') {
  return `${clientIp(req)}:${suffix}`;
}
