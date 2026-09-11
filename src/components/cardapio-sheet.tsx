'use client';

import Link from 'next/link';
import { Timer } from 'lucide-react';

import { useState, useEffect } from 'react';
import { withinOpeningHours } from '@/domains/shop/hours';
import { apiGet } from '@/infra/http-client';

/**
 * Faixa fina com o estado real da loja: horário local + interrutor manual
 * de encerramento (férias/avaria) vindo da API de estado.
 */
export function CardapioSheet() {
  const [info, setInfo] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    let manualClosed = false;
    // O encerramento manual muda raramente: sincroniza no arranque e re-avalia a hora local.
    apiGet<{ manualClosed: boolean }>('/api/shop-status')
      .then((r) => {
        if (r.ok) manualClosed = r.data.manualClosed;
      })
      .catch(() => {});
    const check = () => {
      const open = withinOpeningHours() && !manualClosed;
      setInfo(
        open
          ? { open: true, label: 'Aberto agora · fecha às 00h00' }
          : manualClosed
            ? { open: false, label: 'Encerrado temporariamente' }
            : { open: false, label: 'Fechado · abre às 06h30' },
      );
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!info) return null;
  return (
    <div className="hidden items-center gap-2 px-6 py-2 text-xs text-muted lg:flex">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${info.open ? 'bg-success' : 'bg-danger'}`} />
      {info.label}
      <span className="text-line">|</span>
      <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> Entrega 40 min · Levantamento 20 min</span>
      <span className="text-line">|</span>
      <Link href="/rastreamento" className="underline-offset-2 hover:underline">Acompanhar pedido</Link>
    </div>
  );
}
