'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiPost } from '@/infra/http-client';
import { safeNext } from '@/infra/safe-redirect';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get('next');
  const next = safeNext(rawNext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost('/api/auth/login', { email, password });
      if (r.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      setError(r.data.error?.message ?? 'Não foi possível iniciar sessão.');
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
    }
    setBusy(false);
  };

  const registerHref = `/registar${rawNext ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="login-email">E-mail</label>
        <input id="login-email" type="email" required autoComplete="email" className="input" placeholder="nome@exemplo.pt" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="login-password">Palavra-passe</label>
          <Link href="/recuperar" className="mb-1.5 text-xs font-medium text-muted hover:text-ink">Esqueci-me</Link>
        </div>
        <input id="login-password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      {error && <p role="alert" className="alert-error">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        Ainda não tem conta? <Link href={registerHref} className="font-semibold text-ink underline underline-offset-2">Criar conta</Link>
      </p>
    </form>
  );
}

export function LoginClient() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
