'use client';

import { useState } from 'react';
import { Plus, Minus, Check, Loader2 } from 'lucide-react';
import { apiPost, emitCartChange } from '@/infra/http-client';

export function AddToCart({ productId, productName, variant = 'full' }: { productId: string; productName?: string; variant?: 'full' | 'compact' }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (amount: number) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost('/api/cart', { productId, qty: amount });
      if (r.ok) {
        emitCartChange();
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      } else {
        setError(r.data.error?.message ?? 'Não foi possível adicionar.');
      }
    } catch {
      setError('Sem ligação. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'compact') {
    return (
      <span className="flex items-center gap-2">
        {error && <span role="alert" className="text-xs font-medium text-danger">{error}</span>}
        <button
          onClick={() => add(1)}
          disabled={busy}
          aria-label={`Adicionar ${productName ?? 'artigo'} ao carrinho`}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${added ? 'bg-success text-surface' : 'bg-brand text-ink hover:bg-brand-deep'}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        <span className="sr-only" aria-live="polite">{added ? 'Adicionado ao carrinho' : ''}</span>
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-line bg-surface">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center text-ink/70 hover:text-ink" aria-label="Diminuir quantidade">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
          <button onClick={() => setQty(Math.min(20, qty + 1))} className="flex h-11 w-11 items-center justify-center text-ink/70 hover:text-ink" aria-label="Aumentar quantidade">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button onClick={() => add(qty)} disabled={busy || added} className="btn-primary flex-1 sm:flex-none sm:min-w-[200px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <><Check className="h-4 w-4" /> Adicionado</> : 'Adicionar ao carrinho'}
        </button>
      </div>
      {error && <p role="alert" className="alert-error mt-3">{error}</p>}
    </div>
  );
}
