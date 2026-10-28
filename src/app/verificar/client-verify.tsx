'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
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
  const [resendError, setResendError] = useState<{ message: string; login: boolean } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // O token é de uso único: nunca o enviar duas vezes (React StrictMode
    // corre os efeitos duas vezes em desenvolvimento).
    if (!token || started.current) return;
    started.current = true;
    apiGet(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((r) => setState(r.ok ? 'ok' : 'fail'))
      .catch(() => setState('fail'));
  }, [token]);

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    setResendError(null);
    try {
      const r = await apiPost<{ alreadyVerified?: boolean }>('/api/auth/resend-verification');
      if (r.ok && r.data.alreadyVerified) setState('ok');
      else if (r.ok) setResent(true);
      else setResendError({ message: r.data.error?.message ?? 'Não foi possível reenviar.', login: r.status === 401 });
    } catch {
      setResendError({ message: 'Sem ligação. Tente novamente.', login: false });
    } finally {
      setBusy(false);
    }
  };

  const resendButton = (label: string) => (
    <>
      <button onClick={resend} disabled={busy || resent} className="btn-secondary mx-auto mt-5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {resent ? 'E-mail enviado' : label}
      </button>
      {resendError && (
        <p role="alert" className="alert-error mt-3">
          {resendError.message}{' '}
          {resendError.login && <Link href="/login?next=/verificar" className="font-bold underline">Entrar</Link>}
        </p>
      )}
    </>
  );

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm">A confirmar o e-mail…</p>
      </div>
    );
  }

  if (state === 'ok') {
    return (
      <div className="text-center">
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
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <XCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-danger">Link inválido ou expirado</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">Peça um novo e-mail de confirmação.</p>
        {resendButton('Reenviar confirmação')}
      </div>
    );
  }

  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/5 text-ink/40">
        <Mail className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">Confirme o seu e-mail</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {email ? <>Enviámos um link para <span className="font-semibold text-ink">{email}</span>.</> : 'Verifique a sua caixa de entrada (e o spam).'}
      </p>
      {resendButton('Reenviar e-mail de confirmação')}
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
