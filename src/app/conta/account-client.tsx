'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MonitorSmartphone, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { dateTimePT } from '@/domains/shared-kernel/money';
import { apiPost } from '@/infra/http-client';

type Session = { id: string; ip: string | null; userAgent: string | null; createdAt: Date | string; lastSeen: Date | string; expiresAt: Date | string; current: boolean };

function parseUA(ua: string | null): string {
  if (!ua) return 'Dispositivo desconhecido';
  if (/iPhone|Android.*Mobile/i.test(ua)) return 'Telemóvel';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'Computador';
  return 'Dispositivo';
}

export function AccountClient({ sessions, currentHash }: { sessions: Session[]; currentHash: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const revoke = async (target: 'all' | 'others') => {
    if (busy) return;
    setBusy(target);
    setMsg(null);
    try {
      const r = await apiPost('/api/auth/sessions', target === 'all' ? { all: true } : {});
      if (r.ok) {
        if (target === 'all') {
          router.push('/login');
          router.refresh();
        }
        setMsg('Sessões terminadas.');
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

  return (
    <div className="mt-5">
      <ul className="divide-y divide-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-4 py-3.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ink/5 text-ink/50">
              <MonitorSmartphone className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
            </span>
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-semibold">
                {parseUA(s.userAgent)}
                {s.current && <span className="chip ml-2 bg-success/10 text-xs font-bold text-success">Este dispositivo</span>}
              </p>
              <p className="mt-0.5 truncate text-muted">
                {s.ip || 'IP oculto'} · última atividade {dateTimePT(new Date(s.lastSeen))}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
        <button onClick={() => revoke('others')} disabled={!!busy} className="btn-secondary text-[13px]">
          {busy === 'others' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Terminar outras sessões
        </button>
        <button onClick={() => revoke('all')} disabled={!!busy} className="btn-ghost !text-danger !hover:bg-danger/10 text-[13px]">
          {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Sair de todos os dispositivos
        </button>
      </div>
      {msg && <p className="mt-3 text-[13px] font-medium text-muted">{msg}</p>}
    </div>
  );
}
