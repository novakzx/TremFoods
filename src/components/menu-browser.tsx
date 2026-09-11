'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X, Flame, Leaf, Timer, Plus } from 'lucide-react';
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
  // Produtos com adicionais obrigatórios não podem usar o botão rápido.
  hasOptions: boolean;
};

/**
 * Navegador do cardápio: pesquisa + filtro por categoria.
 * Tudo no cliente para resposta imediata; dados vêm do servidor (SSR).
 */
export function MenuBrowser({ products }: { products: ProductView[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [open, setOpen] = useState(false); // pesquisa mobile alternada

  const categories = useMemo(() => {
    const map = new Map<string, ProductView['category']>();
    for (const p of products) if (p.category && !map.has(p.category.id)) map.set(p.category.id, p.category);
    return [...map.values()].sort((a, b) => a.sort - b.sort);
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'all' && p.categoryId !== cat) return false;
      if (!needle) return true;
      return p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle);
    });
  }, [products, q, cat]);

  const groups = useMemo(() => {
    const g: { cat: ProductView['category']; items: ProductView[] }[] = [];
    for (const c of categories) {
      const items = filtered.filter((p) => p.categoryId === c.id);
      if (items.length) g.push({ cat: c, items });
    }
    return g;
  }, [filtered, categories]);

  return (
    <div>
      {/* barra de pesquisa + filtros */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div className="flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar no cardápio…"
              className="input pl-10 pr-9"
              aria-label="Pesquisar no cardápio"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink" aria-label="Limpar pesquisa">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="btn-secondary py-2.5 lg:hidden" aria-expanded={open}>
            {cat === 'all' ? 'Categorias' : categories.find((c) => c.id === cat)?.name}
          </button>
        </div>
        <div className={`${open ? 'mt-3 flex flex-wrap gap-2' : 'hidden gap-2'} lg:mt-3 lg:flex lg:flex-wrap`}>
          <button
            onClick={() => { setCat('all'); setOpen(false); }}
            className={`chip border px-3.5 py-1.5 transition-all ${cat === 'all' ? 'border-transparent bg-gradient-to-r from-brand to-accent text-ink shadow-sm' : 'border-line bg-surface text-ink/70 hover:border-brand/40 hover:text-brand'}`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCat(c.id); setOpen(false); }}
              className={`chip border px-3.5 py-1.5 transition-all ${cat === c.id ? 'border-transparent bg-gradient-to-r from-brand to-accent text-ink shadow-sm' : 'border-line bg-surface text-ink/70 hover:border-brand/40 hover:text-brand'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* grupos por categoria */}
      {q.trim() === '' && cat === 'all' ? (
        groups.map((g) => (
          <section key={g.cat.id} id={g.cat.slug} className="scroll-mt-44 pt-10">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-2xl font-bold tracking-tight">{g.cat.name}</h2>
              <span className="text-sm text-muted">{g.items.length} {g.items.length === 1 ? 'artigo' : 'artigos'}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((p) => (
                <MenuCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="pt-10">
          {filtered.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-16 text-center">
              <Search className="h-8 w-8 text-muted/50" />
              <p className="font-display text-lg font-semibold">Sem resultados</p>
              <p className="max-w-sm text-sm text-muted">Não encontrámos artigos para a sua pesquisa. Experimente outro termo ou categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <MenuCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MenuCard({ p }: { p: ProductView }) {
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <a href={`/cardapio/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F5EBDB]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {p.isNew && <span className="chip bg-gradient-to-r from-brand to-accent text-ink shadow-sm">Novo</span>}
          {p.isVegetarian && <span className="chip bg-surface/95 text-success"><Leaf className="h-3 w-3" /> Vegetariano</span>}
          {p.isSpicy && <span className="chip bg-surface/95 text-danger"><Flame className="h-3 w-3" /> Picante</span>}
        </div>
        {!p.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <span className="chip bg-surface text-ink">Esgotado</span>
          </div>
        )}
      </a>
      <div className="flex flex-1 flex-col p-4">
        <a href={`/cardapio/${p.slug}`} className="font-display text-[15px] font-bold leading-snug tracking-tight hover:underline underline-offset-2">
          {p.name}
        </a>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">{p.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-brand">{eur(p.priceCents)}</span>
          {p.hasOptions && p.available ? (
            <Link href={`/cardapio/${p.slug}`} aria-label="Ver opções" className="rounded-full bg-gradient-to-br from-brand to-accent p-2.5 text-ink shadow-sm transition-transform hover:scale-105 active:scale-95">
              <Plus className="h-4 w-4" />
            </Link>
          ) : p.available ? (
            <AddToCart productId={p.id} variant="compact" />
          ) : (
            <Timer className="h-4 w-4 text-muted/40" />
          )}
        </div>
      </div>
    </article>
  );
}
