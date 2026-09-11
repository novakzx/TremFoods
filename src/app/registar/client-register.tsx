'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, User, Mail, Lock, UserPlus } from 'lucide-react';
import { apiPost } from '@/infra/http-client';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
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
      const r = await apiPost('/api/auth/register', form);
      if (r.ok) {
        setDone(true);
        const login = await apiPost('/api/auth/login', { email: form.email, password: form.password });
        if (login.ok) {
          router.push(next);
          router.refresh();
        }
      } else {
        setError(r.data.error?.message ?? 'Não foi possível criar a conta.');
        setBusy(false);
      }
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.');
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <p className="font-display text-lg font-bold text-success">Conta criada</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Enviámos um e-mail de confirmação para <span className="font-semibold text-ink">{form.email}</span>.
          Confirme antes de fazer o primeiro pedido. Se não receber, verifique a pasta de spam.
        </p>
        <Link href={`/verificar?email=${encodeURIComponent(form.email)}`} className="btn-secondary mx-auto mt-5">Reenviar e-mail de confirmação</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="reg-name">Nome completo</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="reg-name" required autoComplete="name" className="input pl-10" placeholder="Ana Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="reg-email">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="reg-email" type="email" required autoComplete="email" className="input pl-10" placeholder="nome@exemplo.pt" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="reg-password">Palavra-passe</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="reg-password" type="password" required minLength={8} autoComplete="new-password" className="input pl-10" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <p className="mt-1.5 text-xs text-muted">Use pelo menos 8 caracteres, com letras e números.</p>
      </div>

      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Criar conta
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        Já tem conta? <Link href={`/login${params.get('next') ? '?next=' + encodeURIComponent(params.get('next')!) : ''}`} className="font-semibold text-ink underline underline-offset-2">Iniciar sessão</Link>
      </p>
      <p className="text-center text-[11px] leading-relaxed text-muted">
        Ao criar conta aceita a <Link href="/termos" className="underline underline-offset-2">Política de Privacidade</Link> e os <Link href="/termos" className="underline underline-offset-2">Termos e Condições</Link>.
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
