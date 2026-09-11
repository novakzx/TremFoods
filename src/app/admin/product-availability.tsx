'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiPatch } from '@/infra/http-client';
import { eur } from '@/domains/shared-kernel/money';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  available: boolean;
};

export function ProductAvailability({ initial }: { initial: ProductRow[] }) {
  const [products, setProducts] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (p: ProductRow) => {
    if (busyId) return;
    setBusyId(p.id);
    try {
      const r = await apiPatch<{ product: { available: boolean } }>(`/api/admin/products/${p.id}`, { available: !p.available });
      if (r.ok) {
        setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, available: r.data.product.available } : x)));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold">Disponibilidade do cardápio</p>
          <p className="text-xs text-muted">Esgotado? Desative o artigo — o carrinho passa a recusá-lo e o cardápio deixa de o mostrar.</p>
        </div>
        <span className="chip bg-ink/5 text-xs">{products.filter((p) => p.available).length}/{products.length} disponíveis</span>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${p.available ? '' : 'text-muted line-through'}`}>{p.name}</p>
              <p className="text-xs text-muted">{p.category} · {eur(p.priceCents)}</p>
            </div>
            <button
              onClick={() => toggle(p)}
              disabled={busyId === p.id}
              aria-pressed={p.available}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${p.available ? 'bg-success' : 'bg-ink/20'} disabled:opacity-60`}
              aria-label={`${p.name}: ${p.available ? 'disponível' : 'esgotado'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${p.available ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </li>
        ))}
      </ul>
      {busyId && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> A guardar…</p>}
    </section>
  );
}
