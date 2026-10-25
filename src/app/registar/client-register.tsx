'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { apiPost } from '@/infra/http-client';
import { safeNext } from '@/infra/safe-redirect';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get('next');
  const next = safeNext(rawNext);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // O registo já inicia sessão (e junta o carrinho de visitante à conta).
      const r = await apiPost('/api/auth/register', form);
      if (r.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(r.data.error?.message ?? 'Não foi possível criar a conta.');
      }
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="h-6 w-6" />
        </span>
        <p className="mt-3 font-display text-lg font-bold">Conta criada</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enviámos um e-mail de confirmação para <span className="font-semibold text-ink">{form.email}</span>.
          Confirme-o antes de fazer o primeiro pedido (veja também o spam).
        </p>
        <Link href={next} className="btn-primary mt-5 w-full">Continuar</Link>
      </div>
    );
  }

  const loginHref = `/login${rawNext ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="reg-name">Nome</label>
        <input id="reg-name" required minLength={2} maxLength={80} autoComplete="name" className="input" placeholder="Ana Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="reg-email">E-mail</label>
        <input id="reg-email" type="email" required autoComplete="email" className="input" placeholder="nome@exemplo.pt" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="reg-password">Palavra-passe</label>
        <input id="reg-password" type="password" required minLength={8} maxLength={100} autoComplete="new-password" className="input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>

      {error && <p role="alert" className="alert-error">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        Já tem conta? <Link href={loginHref} className="font-semibold text-ink underline underline-offset-2">Entrar</Link>
      </p>
      <p className="text-center text-[11px] leading-relaxed text-muted">
        Ao criar conta aceita a <Link href="/privacidade" className="underline underline-offset-2">Política de Privacidade</Link> e os <Link href="/termos" className="underline underline-offset-2">Termos e Condições</Link>.
      </p>
    </form>
  );
}

export function RegisterClient() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
