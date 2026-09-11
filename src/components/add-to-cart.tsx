'use client';

import { useState } from 'react';
import { Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { apiPost, emitCartChange } from '@/infra/http-client';

export function AddToCart({ productId, variant = 'full' }: { productId: string; variant?: 'full' | 'compact' }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await apiPost('/api/cart', { productId, qty });
      if (r.ok) {
        emitCartChange();
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={add}
        disabled={busy}
        aria-label="Adicionar ao carrinho"
        className="rounded-full bg-brand p-2.5 text-ink transition-colors hover:bg-brand-deep disabled:opacity-60"
      >
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-full border border-line bg-surface">
        <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-ink/70 transition-colors hover:text-brand" aria-label="Diminuir quantidade">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
        <button onClick={() => setQty(Math.min(20, qty + 1))} className="p-3 text-ink/70 transition-colors hover:text-brand" aria-label="Aumentar quantidade">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button onClick={add} disabled={busy || added} className="btn-primary flex-1 sm:flex-none sm:min-w-[190px]">
        {added ? (<><Check className="h-4 w-4" /> Adicionado</>) : (<><ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho</>)}
      </button>
    </div>
  );
}
