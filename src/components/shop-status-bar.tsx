'use client';

import { useEffect, useState } from 'react';
import { OPENING_HOURS_LABEL } from '@/domains/shop/hours';
import { apiGet } from '@/infra/http-client';

type ShopStatus = { open: boolean; manualClosed: boolean };

/**
 * Faixa fina com o estado real da loja. O servidor decide (hora de Lisboa +
 * interruptor manual de encerramento); o browser só mostra e reconsulta.
 */
export function ShopStatusBar() {
  const [status, setStatus] = useState<ShopStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      apiGet<ShopStatus>('/api/shop-status')
        .then((r) => {
          if (r.ok && !cancelled) setStatus({ open: r.data.open, manualClosed: r.data.manualClosed });
        })
        .catch(() => {});
    check();
    const t = setInterval(check, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!status) return null;
  const label = status.open
    ? `Aberto agora · ${OPENING_HOURS_LABEL}`
    : status.manualClosed
      ? 'Encerrado temporariamente — não estamos a aceitar pedidos'
      : 'Fechado agora · abrimos às 06h30';

  return (
    <div className={`border-t text-xs ${status.open ? 'border-line bg-paper text-muted' : 'border-danger/20 bg-danger/5 font-medium text-danger'}`}>
      <p className="container-app flex items-center gap-2 py-1.5">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${status.open ? 'bg-success' : 'bg-danger'}`} />
        {label}
      </p>
    </div>
  );
}
