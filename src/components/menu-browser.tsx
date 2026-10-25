'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X, Flame, Leaf, Plus } from 'lucide-react';
import { AddToCart } from './add-to-cart';
import { eur } from '@/domains/shared-kernel/money';

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  image: string;
  available: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  category: { id: string; name: string; slug: string; sort: number };
  categoryId: string;
  // Produtos com adicionais abrem a ficha (escolha obrigatória antes de adicionar).
  hasOptions: boolean;
};

// Pesquisa sem acentos nem maiúsculas ("acai" encontra "Açaí").
const fold = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Navegador do cardápio: pesquisa + filtro por categoria.
 * Tudo no cliente para resposta imediata; dados vêm do servidor (SSR).
 */
export function MenuBrowser({ products }: { products: ProductView[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  const categories = useMemo(() => {
    const map = new Map<string, ProductView['category']>();
    for (const p of products) if (p.category && !map.has(p.category.id)) map.set(p.category.id, p.category);
    return [...map.values()].sort((a, b) => a.sort - b.sort);
  }, [products]);

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    return products.filter((p) => {
      if (cat !== 'all' && p.categoryId !== cat) return false;
      if (!needle) return true;
      return fold(p.name).includes(needle) || fold(p.description).includes(needle);
    });
  }, [products, q, cat]);

  const groups = useMemo(
    () =>
      categories
        .map((c) => ({ cat: c, items: filtered.filter((p) => p.categoryId === c.id) }))
        .filter((g) => g.items.length > 0),
    [filtered, categories],
  );

  if (products.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-display text-lg font-semibold">Cardápio indisponível de momento</p>
        <p className="mt-1 text-sm text-muted">Tente novamente dentro de instantes ou ligue 964 994 787.</p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
      active ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink/80 hover:border-ink/40'
    }`;

  return (
    <div>
      {/* pesquisa + categorias (fixas no topo ao deslizar) */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-line bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar no cardápio"
            className="input pl-10 pr-10"
            aria-label="Pesquisar no cardápio"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink" aria-label="Limpar pesquisa">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6" role="tablist" aria-label="Categorias">
          <button role="tab" aria-selected={cat === 'all'} onClick={() => setCat('all')} className={chip(cat === 'all')}>
            Tudo
          </button>
          {categories.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card mt-6 px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Sem resultados</p>
          <p className="mt-1 text-sm text-muted">Experimente outro termo ou categoria.</p>
          <button onClick={() => { setQ(''); setCat('all'); }} className="btn-secondary btn-sm mt-4">Ver tudo</button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.cat.id} id={g.cat.slug} className="scroll-mt-40 pt-8" aria-labelledby={`cat-${g.cat.id}`}>
            <h2 id={`cat-${g.cat.id}`} className="mb-3 font-display text-xl font-bold tracking-tight">{g.cat.name}</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((p) => (
                <li key={p.id}>
                  <MenuCard p={p} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

// Cartão do cardápio: foto em cima (como sempre foi), nome, descrição, preço e botão "+".
export function MenuCard({ p }: { p: ProductView }) {
  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-colors hover:border-ink/25">
      <Link href={`/cardapio/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F5EBDB]" tabIndex={-1} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.isNew && <span className="chip bg-ink/90 text-white">Novo</span>}
          {p.isVegetarian && <span className="chip bg-surface/95 text-success"><Leaf className="h-3 w-3" /> Vegetariano</span>}
          {p.isSpicy && <span className="chip bg-surface/95 text-danger"><Flame className="h-3 w-3" /> Picante</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/cardapio/${p.slug}`} className="font-display text-[15px] font-bold leading-snug tracking-tight hover:underline underline-offset-2">
          {p.name}
        </Link>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">{p.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-brand-deep">{eur(p.priceCents)}</span>
          {p.hasOptions ? (
            <Link href={`/cardapio/${p.slug}`} aria-label={`Escolher opções de ${p.name}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-ink transition-colors hover:bg-brand-deep">
              <Plus className="h-4 w-4" />
            </Link>
          ) : (
            <AddToCart productId={p.id} productName={p.name} variant="compact" />
          )}
        </div>
      </div>
    </article>
  );
}
