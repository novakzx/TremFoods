'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
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

  const load = useCallback(async () => {
    try {
      const r = await apiGet<CartData>('/api/cart');
      if (r.ok) setCart(r.data);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('basket:changed', load);
    return () => window.removeEventListener('basket:changed', load);
  }, [load]);

  const setQty = async (itemId: string, qty: number) => {
    if (qty < 1 || busyId) return;
    setBusyId(itemId);
    try {
      const r = await apiPatch('/api/cart', { itemId, qty });
      if (r.ok) {
        setCart((c) => c ? { ...c, ...r.data } : c);
        emitCartChange();
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (itemId: string) => {
    if (busyId) return;
    setBusyId(itemId);
    try {
      const r = await apiDelete('/api/cart', { itemId });
      if (r.ok) {
        setCart((c) => c ? { ...c, ...r.data } : c);
        emitCartChange();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="font-display text-lg font-bold">Não foi possível carregar o carrinho</p>
        <p className="mt-2 text-sm text-muted">Tente novamente.</p>
        <button onClick={load} className="btn-secondary mx-auto mt-5">Tentar novamente</button>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/40">
          <ShoppingBag className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted">A carregar o carrinho…</p>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/40">
          <ShoppingBag className="h-6 w-6" />
        </span>
        <h1 className="font-display text-xl font-bold">O carrinho está vazio</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Escolha hambúrgueres, acompanhamentos e bebidas no nosso cardápio.
        </p>
        <Link href="/cardapio" className="btn-primary mx-auto mt-6">
          <ArrowLeft className="h-4 w-4" /> Ver o cardápio
        </Link>
      </div>
    );
  }

  const missing = cart.items.some((i) => !i.product.available);
  const remainingForFree = FREE_DELIVERY_FROM_CENTS - cart.subtotalCents;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Carrinho</h1>
        <p className="mt-1.5 text-sm text-muted">{cart.count} {cart.count === 1 ? 'artigo' : 'artigos'} no carrinho</p>

        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {cart.items.map((i) => (
            <li key={i.id} className="flex gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.product.image} alt={i.product.name} className="h-20 w-20 flex-none rounded-xl border border-line object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/cardapio/${i.product.slug}`} className="font-display text-[15px] font-bold leading-snug hover:underline underline-offset-2">
                    {i.product.name}
                  </Link>
                  <button onClick={() => remove(i.id)} disabled={busyId === i.id} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remover ${i.product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {i.options.length > 0 && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {i.options.map((o) => `${o.name}${o.priceCents > 0 ? ` (+${eur(o.priceCents)})` : ''}`).join(' · ')}
                  </p>
                )}
                {!i.product.available && (
                  <p className="mt-1 inline-flex w-fit rounded-md bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                    Indisponível — remova ou ajuste o pedido
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-xl border border-line">
                    <button onClick={() => setQty(i.id, i.qty - 1)} disabled={busyId === i.id || !i.product.available} className="p-2.5 text-ink/60 hover:text-ink disabled:opacity-40" aria-label="Diminuir">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} disabled={busyId === i.id || !i.product.available} className="p-2.5 text-ink/60 hover:text-ink disabled:opacity-40" aria-label="Aumentar">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-[15px] font-bold">{eur(i.unitPriceCents * i.qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/cardapio" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Continuar a comprar
        </Link>
      </div>

      <aside className="card sticky top-24 p-5 lg:top-28">
        <h2 className="font-display text-lg font-bold tracking-tight">Resumo</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold">{eur(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Entrega ao domicílio</dt>
            <dd className="font-semibold">
              {remainingForFree > 0 ? eur(DELIVERY_FEE_CENTS) : 'Grátis'}
            </dd>
          </div>
          {remainingForFree > 0 && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent-ink">
              Faltam {eur(remainingForFree)} para entrega gratuita.
            </p>
          )}
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="font-semibold">Total estimado</dt>
            <dd className="font-display text-lg font-extrabold">
              {eur(cart.subtotalCents + (remainingForFree > 0 ? DELIVERY_FEE_CENTS : 0))}
            </dd>
          </div>
        </dl>
        {missing ? (
          <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger">
            Há artigos indisponíveis no carrinho. Remova-os para continuar.
          </p>
        ) : (
          <Link href="/checkout" className="btn-primary mt-5 w-full">
            Finalizar pedido <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          O levantamento na loja não tem taxa de entrega.
        </p>
      </aside>
    </div>
  );
}
