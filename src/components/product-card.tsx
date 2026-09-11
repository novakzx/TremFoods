import Link from 'next/link';
import { Flame, Leaf, Plus } from 'lucide-react';
import { AddToCart } from './add-to-cart';
import type { Product } from '@prisma/client';
import { eur } from '@/domains/shared-kernel/money';
import { prisma } from '@/infra/db';

export function ProductCard({ product, hasOptions = false }: { product: Product; hasOptions?: boolean }) {
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/cardapio/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F5EBDB]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.isNew && <span className="chip bg-ink/90 text-white">Novo</span>}
          {product.isVegetarian && (
            <span className="chip bg-surface/95 text-success"><Leaf className="h-3 w-3" /> Vegetariano</span>
          )}
          {product.isSpicy && (
            <span className="chip bg-surface/95 text-danger"><Flame className="h-3 w-3" /> Picante</span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/cardapio/${product.slug}`} className="font-display text-[15px] font-bold leading-snug tracking-tight hover:underline underline-offset-2">
          {product.name}
        </Link>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">{product.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-brand">{eur(product.priceCents)}</span>
          {hasOptions ? (
            <Link href={`/cardapio/${product.slug}`} aria-label="Ver opções" className="rounded-full bg-brand p-2.5 text-ink transition-colors hover:bg-brand-deep">
              <Plus className="h-4 w-4" />
            </Link>
          ) : (
            <AddToCart productId={product.id} variant="compact" />
          )}
        </div>
      </div>
    </article>
  );
}
