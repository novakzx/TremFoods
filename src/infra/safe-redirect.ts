// Destino pós-login vindo de `?next=`: só caminhos internos. Um valor como
// "https://site-falso.pt" ou "//site-falso.pt" levaria o cliente, já com
// sessão iniciada, para fora do site (phishing).
export function safeNext(next: string | null | undefined, fallback = '/') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
