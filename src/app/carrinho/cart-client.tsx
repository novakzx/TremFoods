'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { eur } from '@/domains/shared-kernel/money';
import { apiGet, apiPatch, apiDelete, emitCartChange } from '@/infra/http-client';
import { DELIVERY_FEE_CENTS, FREE_DELIVERY_FROM_CENTS } from '@/domains/delivery/delivery-policy';

type CartOption = { itemId: string; name: string; priceCents: number };
type CartItem = { id: string; qty: number; unitPriceCents: number; options: CartOption[]; product: { id: string; slug: string; name: string; priceCents: number; image: string; available: boolean } };
type CartData = { count: number; subtotalCents: number; items: CartItem[] };

export function CartClient() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<CartData>('/api/cart');
      if (r.ok) {
        setCart(r.data);
        setLoadError(false);
      } else setLoadError(true);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Depois de cada alteração recarrega o carrinho completo (linhas + totais).
  const mutate = async (itemId: string, call: () => ReturnType<typeof apiPatch>) => {
    if (busyId) return;
    setBusyId(itemId);
    setActionError(null);
    try {
      const r = await call();
      if (!r.ok) setActionError(r.data.error?.message ?? 'Não foi possível atualizar o carrinho.');
      await load();
      emitCartChange();
    } catch {
      setActionError('Sem ligação. Tente novamente.');
    } finally {
      setBusyId(null);
    }
  };
  const setQty = (itemId: string, qty: number) => mutate(itemId, () => apiPatch('/api/cart', { itemId, qty }));
  const remove = (itemId: string) => mutate(itemId, () => apiDelete('/api/cart', { itemId }));

  if (loadError) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="font-display text-lg font-bold">Não foi possível carregar o carrinho</p>
        <button onClick={load} className="btn-secondary mx-auto mt-5">Tentar novamente</button>
      </div>
    );
  }

  if (!cart) {
    return <p className="py-16 text-center text-sm text-muted">A carregar o carrinho…</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-muted" />
        <h1 className="mt-3 font-display text-xl font-bold">O carrinho está vazio</h1>
        <p className="mt-1 text-sm text-muted">Escolha o que lhe apetece no cardápio.</p>
        <Link href="/cardapio" className="btn-primary mx-auto mt-5">Ver o cardápio</Link>
      </div>
    );
  }

  const missing = cart.items.some((i) => !i.product.available);
  const remainingForFree = FREE_DELIVERY_FROM_CENTS - cart.subtotalCents;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Carrinho</h1>
        {actionError && <p role="alert" className="alert-error mt-4">{actionError}</p>}

        <ul className="card mt-4 divide-y divide-line">
          {cart.items.map((i) => (
            <li key={i.id} className={`flex gap-3 p-3 sm:p-4 ${busyId === i.id ? 'opacity-60' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.product.image} alt={i.product.name} className="h-20 w-20 flex-none rounded-xl border border-line object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/cardapio/${i.product.slug}`} className="font-semibold leading-snug hover:underline underline-offset-2">
                    {i.product.name}
                  </Link>
                  <span className="flex-none font-semibold">{eur(i.unitPriceCents * i.qty)}</span>
                </div>
                {i.options.length > 0 && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {i.options.map((o) => `${o.name}${o.priceCents > 0 ? ` (+${eur(o.priceCents)})` : ''}`).join(' · ')}
                  </p>
                )}
                {!i.product.available && (
                  <p className="mt-1 text-xs font-semibold text-danger">Esgotado — remova para continuar</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-line">
                    <button onClick={() => (i.qty > 1 ? setQty(i.id, i.qty - 1) : remove(i.id))} disabled={!!busyId} className="flex h-9 w-9 items-center justify-center text-ink/70 hover:text-ink disabled:opacity-40" aria-label={i.qty > 1 ? `Diminuir ${i.product.name}` : `Remover ${i.product.name}`}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold" aria-label={`Quantidade: ${i.qty}`}>{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} disabled={!!busyId || !i.product.available || i.qty >= 20} className="flex h-9 w-9 items-center justify-center text-ink/70 hover:text-ink disabled:opacity-40" aria-label={`Aumentar ${i.product.name}`}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={() => remove(i.id)} disabled={!!busyId} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remover ${i.product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/cardapio" className="mt-3 inline-block text-sm font-medium text-muted hover:text-ink">+ Adicionar mais artigos</Link>
      </div>

      <aside className="card p-4 sm:p-5 lg:sticky lg:top-20">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold">{eur(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Entrega</dt>
            <dd>{remainingForFree > 0 ? eur(DELIVERY_FEE_CENTS) : 'Grátis'}</dd>
          </div>
          {remainingForFree > 0 && (
            <p className="text-xs text-muted">Faltam {eur(remainingForFree)} para a entrega grátis. Levantamento na loja não tem taxa.</p>
          )}
        </dl>
        {missing ? (
          <p className="alert-error mt-4">Há artigos esgotados no carrinho. Remova-os para continuar.</p>
        ) : (
          <Link href="/checkout" className="btn-primary mt-4 w-full">Finalizar pedido · {eur(cart.subtotalCents + (remainingForFree > 0 ? DELIVERY_FEE_CENTS : 0))}</Link>
        )}
      </aside>
    </div>
  );
}
