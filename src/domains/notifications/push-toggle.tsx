'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { pushSupported, pushPublicKey, subscribeToOrder, unsubscribeFromOrder, currentPushStatus } from './push-client';

export function PushToggle({ orderNumber, code }: { orderNumber: string; code?: string }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pushSupported() || !pushPublicKey()) return;
    currentPushStatus().then((s) => {
      if (!cancelled) setActive(s === 'active');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pushSupported() || !pushPublicKey()) return null;

  const toggle = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (active) {
        await unsubscribeFromOrder();
        setActive(false);
      } else {
        const r = await subscribeToOrder(orderNumber, code);
        if (r.ok) {
          setActive(true);
          setNotice('Notificações ativas — avisamos quando o estado mudar.');
        } else if (r.status === 'DENIED') {
          setNotice('Permissão de notificações bloqueada no navegador. Ative nas definições do site.');
        } else {
          setNotice('Não foi possível ativar neste dispositivo.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent-ink">
          {active ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5 text-muted" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{active ? 'Notificações ativas' : 'Acompanhe este pedido'}</p>
          <p className="text-xs text-muted">
            {active ? 'Vai receber um aviso a cada mudança de estado.' : 'Receba um aviso quando o estado mudar.'}
          </p>
          {notice && <p className="mt-1 text-xs font-medium text-accent-ink">{notice}</p>}
        </div>
      </div>
      <button onClick={toggle} disabled={busy} className="btn-secondary shrink-0 text-xs">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? 'Desativar' : 'Ativar notificações'}
      </button>
    </div>
  );
}
