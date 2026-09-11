'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, BellRing } from 'lucide-react';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { apiGet } from '@/infra/http-client';

/**
 * Sonda o estado do pedido a cada 20 s enquanto não estiver concluído.
 * Notifica o cliente quando o estado muda (permite notificações do browser).
 */
export function OrderTracker({ number, initialStatus, deliveryMethod }: { number: string; initialStatus: string; deliveryMethod: 'DELIVERY' | 'PICKUP' }) {
  const [status, setStatus] = useState(initialStatus);
  const [spin, setSpin] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if ('Notification' in window) setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (status === 'DELIVERED' || status === 'CANCELLED') return;
    let cancelled = false;
    setSpin(true);
    const poll = async () => {
      try {
        const r = await apiGet<{ status: string }>(`/api/orders/${number}`);
        if (!r.ok || cancelled) return;
        if (r.data.status !== status) {
          setStatus(r.data.status);
          const label = LIFECYCLE[r.data.status]?.label ?? r.data.status;
          if (perm === 'granted') {
            try {
              new Notification('Trem Food — atualização do pedido', { body: `${number}: ${label}`, icon: '/icons/icon-192.png' });
            } catch { /* alguns browsers exigem SW */ }
          }
        }
      } catch {
        /* rede indisponível — tenta novamente no próximo ciclo */
      }
    };
    const t = setInterval(async () => {
      await poll();
      if (status === 'DELIVERED' || status === 'CANCELLED') setSpin(false);
    }, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [status, number, perm]);

  const done = status === 'DELIVERED' || status === 'CANCELLED';

  return (
    <span className="flex items-center gap-2 text-[13px] font-medium text-muted">
      {done ? (
        <><CheckCircle2 className="h-4 w-4 text-success" /> Atualização automática desligada</>
      ) : (
        <><Loader2 className={`h-4 w-4 text-accent ${spin ? 'animate-spin' : ''}`} /> Atualiza a cada 20 segundos</>
      )}
      {!done && perm === 'default' && 'Notification' in window && (
        <button
          className="ml-1 inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold hover:border-ink/30"
          onClick={() => 'Notification' in window && Notification.requestPermission().then(setPerm)}
        >
          <BellRing className="h-3 w-3" /> Ativar alertas
        </button>
      )}
    </span>
  );
}
