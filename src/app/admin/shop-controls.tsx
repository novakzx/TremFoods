'use client';

import { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import { apiPatch } from '@/infra/http-client';

export function ShopControls({ initialClosed, statusLabel }: { initialClosed: boolean; statusLabel: string }) {
  const [closed, setClosed] = useState(initialClosed);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiPatch('/api/admin/shop', { closed: !closed });
      if (r.ok) setClosed(!closed);
      else setErr(r.data.error?.message ?? 'Não foi possível alterar o estado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${closed ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
            <Store className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-bold">Estado da loja</p>
            <p className="text-xs text-muted">Atual: {statusLabel}</p>
          </div>
        </div>
        <button onClick={toggle} disabled={busy} className={`btn-secondary text-xs ${closed ? '!border-danger/40 !text-danger' : ''}`}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : closed ? 'Reabrir loja' : 'Encerrar (férias/avaria)'}
        </button>
      </div>
      {err && <p className="mt-3 text-xs font-medium text-danger">{err}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Com a loja encerrada, o checkout recusa novos pedidos (o site continua a mostrar o cardápio). O horário normal
        é todos os dias 06h30–00h00.
      </p>
    </section>
  );
}
