'use client';

/** Cliente HTTP interno: CSRF (double-submit) + fetch tipado para a API. */

let csrfPromise: Promise<string> | null = null;

export function getCsrf(): Promise<string> {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => d.csrfToken as string)
      .catch((e) => {
        // Não deixar a cache envenenada: a próxima chamada tenta de novo.
        csrfPromise = null;
        throw e;
      });
  }
  return csrfPromise;
}

function invalidateCsrf() {
  csrfPromise = null;
}

export type ApiResult<T = Record<string, never>> = { ok: boolean; status: number; data: T & { error?: { code: string; message: string } } };

async function mut<T = Record<string, never>>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = await getCsrf();
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-csrf-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  // Se o cookie foi perdido/substituído (ex.: expirou enquanto a página estava
  // aberta), o token no header deixa de casar — renova e tenta uma vez.
  if (res.status === 403 && data.error?.code === 'CSRF') {
    invalidateCsrf();
    const retryToken = await getCsrf();
    const retry = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-csrf-token': retryToken },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const retryData = await retry.json().catch(() => ({}));
    return { ok: retry.ok, status: retry.status, data: retryData };
  }

  return { ok: res.ok, status: res.status, data };
}

export function apiPost<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('POST', path, body);
}
export function apiPatch<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('PATCH', path, body);
}
export function apiPut<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('PUT', path, body);
}
export function apiDelete<T = Record<string, never>>(path: string, body?: unknown) {
  return mut<T>('DELETE', path, body);
}
export async function apiGet<T = Record<string, never>>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(path, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function emitCartChange() {
  window.dispatchEvent(new CustomEvent('basket:changed'));
}
