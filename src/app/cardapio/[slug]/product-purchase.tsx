'use client';

import { useMemo, useState } from 'react';
import { Check, ShoppingBag, Loader2, Minus, Plus } from 'lucide-react';
import { apiPost, emitCartChange } from '@/infra/http-client';
import { eur } from '@/domains/shared-kernel/money';
import type { OptionGroupWithItems } from '@/domains/menu/options';

export function ProductPurchase({ productId, basePriceCents, groups }: {
  productId: string;
  basePriceCents: number;
  groups: OptionGroupWithItems[];
}) {
  const [qty, setQty] = useState(1);
  // Seleção por grupo: mapa groupId → conjunto de itemIds.
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, new Set<string>()])),
  );
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allItems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; priceCents: number }>();
    for (const g of groups) for (const o of g.options) map.set(o.id, o);
    return map;
  }, [groups]);

  const extraCents = useMemo(() => {
    let sum = 0;
    for (const ids of Object.values(selected)) for (const id of ids) sum += allItems.get(id)?.priceCents ?? 0;
    return sum;
  }, [selected, allItems]);

  // Um grupo obrigatório sem escolha bloqueia o botão (mesma regra do servidor).
  const missingRequired = groups.some((g) => g.required && selected[g.id].size === 0);

  const toggle = (group: OptionGroupWithItems, itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[group.id]);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        if (!group.multiple) next.clear();
        if (group.maxSelect && next.size >= group.maxSelect) return prev;
        next.add(itemId);
      }
      return { ...prev, [group.id]: next };
    });
    setError(null);
  };

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const options = Object.values(selected)
      .flatMap((ids) => [...ids])
      .map((itemId) => ({ itemId }));
    try {
      const r = await apiPost('/api/cart', { productId, qty, options });
      if (r.ok) {
        emitCartChange();
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      } else {
        setError(r.data.error?.message ?? 'Não foi possível adicionar. Tente novamente.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {g.name}
            {g.required ? <span className="text-xs font-medium text-muted">obrigatório</span> : <span className="text-xs font-medium text-muted">opcional</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.options.map((o) => {
              const isOn = selected[g.id].has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(g, o.id)}
                  aria-pressed={isOn}
                  disabled={!o.available || (!isOn && g.multiple && !!g.maxSelect && selected[g.id].size >= g.maxSelect)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                    isOn ? 'border-ink bg-surface ring-2 ring-accent/40' : 'border-line bg-surface hover:border-ink/30'
                  } disabled:opacity-50`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`flex h-4.5 w-4.5 flex-none items-center justify-center rounded-md border ${isOn ? 'border-accent bg-accent text-accent-ink' : 'border-ink/25'}`} style={{ height: 18, width: 18 }}>
                      {isOn && <Check className="h-3 w-3" />}
                    </span>
                    <span className="font-medium">{o.name}</span>
                    {!o.available && <span className="text-xs text-muted">(esgotado)</span>}
                  </span>
                  {o.priceCents > 0 && <span className="text-muted">+{eur(o.priceCents)}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-line">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-ink/70 hover:text-ink" aria-label="Diminuir quantidade">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
          <button onClick={() => setQty(Math.min(20, qty + 1))} className="p-3 text-ink/70 hover:text-ink" aria-label="Aumentar quantidade">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button onClick={add} disabled={busy || added || missingRequired} className="btn-primary flex-1 sm:flex-none sm:min-w-[190px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <><Check className="h-4 w-4" /> Adicionado</> : <><ShoppingBag className="h-4 w-4" /> Adicionar · {eur((basePriceCents + extraCents) * qty)}</>}
        </button>
      </div>
    </div>
  );
}
