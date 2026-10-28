'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { dateTimePT } from '@/domains/shared-kernel/money';
import { apiPost } from '@/infra/http-client';

type Session = { id: string; ip: string | null; userAgent: string | null; lastSeen: Date | string; current: boolean };

function deviceLabel(ua: string | null): string {
  if (!ua) return 'Dispositivo desconhecido';
  if (/iPhone|Android.*Mobile/i.test(ua)) return 'Telemóvel';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'Computador';
  return 'Dispositivo';
}

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost('/api/auth/logout');
      if (r.ok) {
        router.push('/');
        router.refresh();
        return;
      }
      setError(r.data.error?.message ?? 'Não foi possível terminar a sessão.');
    } catch {
      setError('Sem ligação. Tente novamente.');
    }
    setBusy(false);
  };

  return (
    <>
      <button onClick={logout} disabled={busy} className="btn-secondary">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Terminar sessão
      </button>
      {error && <p role="alert" className="alert-error w-full">{error}</p>}
    </>
  );
}

export function AccountClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const revoke = async (target: 'all' | 'others') => {
    if (busy) return;
    if (target === 'all' && !window.confirm('Terminar a sessão em todos os dispositivos, incluindo este?')) return;
    setBusy(target);
    setMsg(null);
    try {
      const r = await apiPost('/api/auth/sessions', target === 'all' ? { all: true } : {});
      if (r.ok) {
        if (target === 'all') {
          router.push('/login');
          router.refresh();
          return;
        }
        setMsg('Sessões nos outros dispositivos terminadas.');
        router.refresh();
      } else {
        setMsg(r.data.error?.message ?? 'Não foi possível terminar as sessões.');
      }
    } catch {
      setMsg('Erro de ligação.');
    } finally {
      setBusy(null);
    }
  };

  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="mt-3">
      <ul className="divide-y divide-line text-[13px]">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5">
            <span className="font-semibold">
              {deviceLabel(s.userAgent)}
              {s.current && <span className="ml-2 font-medium text-success">· este dispositivo</span>}
            </span>
            <span className="text-muted">{s.ip || 'IP desconhecido'} · {dateTimePT(new Date(s.lastSeen))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        {others > 0 && (
          <button onClick={() => revoke('others')} disabled={!!busy} className="btn-secondary btn-sm">
            {busy === 'others' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Terminar as outras ({others})
          </button>
        )}
        <button onClick={() => revoke('all')} disabled={!!busy} className="btn-ghost btn-sm text-danger hover:bg-danger/10 hover:text-danger">
          {busy === 'all' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Sair de todos os dispositivos
        </button>
      </div>
      {msg && <p className="mt-2 text-[13px] text-muted">{msg}</p>}
    </div>
  );
}
