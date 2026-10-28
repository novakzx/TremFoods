'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiPost } from '@/infra/http-client';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As palavras-passe não coincidem.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost('/api/auth/reset', { token, password });
      if (r.ok) setDone(true);
      else setError(r.data.error?.message ?? 'Link inválido ou expirado.');
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <p role="alert" className="alert-error">
        Falta o token no link. Peça um novo em <Link href="/recuperar" className="font-bold underline">recuperar palavra-passe</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="font-display text-lg font-bold text-success">Palavra-passe alterada</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A sua palavra-passe foi alterada e todas as sessões foram terminadas por segurança.
        </p>
        <Link href="/login" className="btn-primary mx-auto mt-5">Iniciar sessão</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="reset-password">Nova palavra-passe</label>
        <input id="reset-password" type="password" required minLength={8} autoComplete="new-password" className="input" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="reset-confirm">Confirmar palavra-passe</label>
        <input id="reset-confirm" type="password" required minLength={8} autoComplete="new-password" className="input" placeholder="Repita a palavra-passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p role="alert" className="alert-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar nova palavra-passe
      </button>
    </form>
  );
}

export function ResetClient() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
