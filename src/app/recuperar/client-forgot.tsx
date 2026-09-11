'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { apiPost } from '@/infra/http-client';

export function ForgotClient() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost('/api/auth/forgot', { email });
      if (r.ok) setDone(true);
      else setError(r.data.error?.message ?? 'Não foi possível enviar o e-mail.');
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <p className="font-display text-lg font-bold text-success">Verifique o seu e-mail</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Se existir uma conta com <span className="font-semibold text-ink">{email}</span>, enviámos um link
          para repor a palavra-passe. O link é válido durante 60 minutos.
        </p>
        <Link href="/login" className="btn-secondary mx-auto mt-5">Voltar ao início de sessão</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="forgot-email">E-mail da conta</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="forgot-email" type="email" required autoComplete="email" className="input pl-10" placeholder="nome@exemplo.pt" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Enviar link de reposição
      </button>
      <p className="pt-2 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-ink underline underline-offset-2">Voltar ao início de sessão</Link>
      </p>
    </form>
  );
}
