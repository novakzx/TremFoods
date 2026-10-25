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
    } catch {
      setNotice('Não foi possível ativar neste dispositivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {active ? <Bell className="h-4.5 w-4.5 flex-none text-brand-deep" /> : <BellOff className="h-4.5 w-4.5 flex-none text-muted" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{active ? 'Notificações ativas' : 'Receber aviso quando o estado mudar'}</p>
          {notice && <p className="mt-0.5 text-xs text-muted">{notice}</p>}
        </div>
      </div>
      <button onClick={toggle} disabled={busy} className="btn-secondary btn-sm shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  );
}
