'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/infra/http-client';

const FINAL = new Set(['DELIVERED', 'CANCELLED']);

/**
 * Consulta o estado do pedido a cada 20 s enquanto não estiver concluído e,
 * quando muda, volta a renderizar a página no servidor (linha do tempo,
 * estado do pagamento, etc.). A sondagem pausa com o separador escondido.
 */
export function OrderTracker({ number, status, paymentStatus }: { number: string; status: string; paymentStatus: string }) {
  const router = useRouter();
  const last = useRef(`${status}|${paymentStatus}`);
  last.current = `${status}|${paymentStatus}`;

  useEffect(() => {
    if (FINAL.has(status) && paymentStatus === 'PAID') return;
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await apiGet<{ status: string; paymentStatus: string }>(`/api/orders/${encodeURIComponent(number)}`);
        if (r.ok && `${r.data.status}|${r.data.paymentStatus}` !== last.current) router.refresh();
      } catch {
        /* rede indisponível — tenta no próximo ciclo */
      }
    };
    const t = setInterval(poll, 20_000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [number, status, paymentStatus, router]);

  if (FINAL.has(status)) return null;
  return <span className="text-xs text-muted">Atualiza automaticamente</span>;
}
