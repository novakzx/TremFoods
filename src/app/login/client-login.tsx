'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';
import { apiPost } from '@/infra/http-client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await apiPost('/api/auth/login', { email, password });
      if (r.ok) {
        if (r.data.error?.code === 'EMAIL_NOT_VERIFIED') {
          setInfo('E-mail ainda não confirmado. <a href="/verificar?email=' + encodeURIComponent(email) + '" class="font-bold underline">Reenviar confirmação</a>.');
          setBusy(false);
          return;
        }
        router.push(next);
        router.refresh();
      } else {
        setError(r.data.error?.message ?? 'Não foi possível iniciar sessão.');
        setBusy(false);
      }
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="login-email">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="login-email" type="email" required autoComplete="email" className="input pl-10" placeholder="nome@exemplo.pt" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="login-password">Palavra-passe</label>
          <Link href="/recuperar" className="text-xs font-medium text-muted hover:text-ink">Esqueci-me da palavra-passe</Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="login-password" type="password" required autoComplete="current-password" className="input pl-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>

      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
      {info && <p className="rounded-xl bg-accent/10 px-4 py-3 text-[13px] font-medium text-accent-ink" dangerouslySetInnerHTML={{ __html: info }} />}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Iniciar sessão
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        Ainda não tem conta? <Link href={`/registar${params.get('next') ? '?next=' + encodeURIComponent(params.get('next')!) : ''}`} className="font-semibold text-ink underline underline-offset-2">Criar conta</Link>
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
