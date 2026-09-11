'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { apiGet, apiPost } from '@/infra/http-client';

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'fail' | 'idle'>(token ? 'loading' : 'idle');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((r) => setState(r.ok ? 'ok' : 'fail'))
      .catch(() => setState('fail'));
  }, [token]);

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiPost('/api/auth/resend-verification', { email });
      setResent(true);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-sm">A confirmar o e-mail…</p>
      </div>
    );
  }

  if (state === 'ok') {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-success">E-mail confirmado</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">A sua conta está ativa. Já pode fazer pedidos.</p>
        <Link href="/cardapio" className="btn-primary mx-auto mt-5">Ver o cardápio</Link>
      </div>
    );
  }

  if (state === 'fail') {
    return (
      <div className="rounded-2xl bg-danger/10 p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <XCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-danger">Link inválido ou expirado</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">Peça um novo e-mail de confirmação.</p>
        <button onClick={resend} disabled={busy} className="btn-secondary mx-auto mt-5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {resent ? 'E-mail enviado' : 'Reenviar confirmação'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-paper p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/5 text-ink/40">
        <Mail className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">Confirme o seu e-mail</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {email ? <>Enviámos um link para <span className="font-semibold text-ink">{email}</span>.</> : 'Verifique a sua caixa de entrada (e o spam).'}
      </p>
      <button onClick={resend} disabled={busy} className="btn-secondary mx-auto mt-5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {resent ? 'E-mail enviado' : 'Reenviar e-mail de confirmação'}
      </button>
    </div>
  );
}

export function VerifyClient() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
