import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Leaf, Flame } from 'lucide-react';
import { AddToCart } from '@/components/add-to-cart';
import { ProductPurchase } from './product-purchase';
import { prisma } from '@/infra/db';
import { eur } from '@/domains/shared-kernel/money';
import { DELIVERY_MINUTES, PICKUP_MINUTES } from '@/domains/delivery/delivery-policy';

async function getProduct(slug: string) {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: { category: true, optionGroups: { orderBy: { sort: 'asc' }, include: { options: { orderBy: { sort: 'asc' } } } } },
    });
  } catch (error) {
    console.error('[ProductPage] Error loading product:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product || !product.available) return { title: 'Produto não encontrado', robots: { index: false } };
  return {
    title: product.name,
    description: `${product.name} — ${product.description ?? ''} ${eur(product.priceCents)}. Peça online na Trem Food, Almada.`,
    alternates: { canonical: `https://tremfood.pt/cardapio/${product.slug}` },
    openGraph: { url: `https://tremfood.pt/cardapio/${product.slug}`, title: `${product.name} · Trem Food`, images: [product.image] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product || !product.available) notFound();

  return (
    <div className="container-app max-w-5xl py-6 sm:py-8">
      <Link href="/cardapio" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Cardápio
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="overflow-hidden rounded-3xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
        </div>

        <div>
          <p className="text-[13px] font-medium text-muted">{product.category.name}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
          {(product.isVegetarian || product.isSpicy || product.isNew) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.isNew && <span className="chip bg-brand-soft text-brand-deep">Novo</span>}
              {product.isVegetarian && <span className="chip bg-success/10 text-success"><Leaf className="h-3.5 w-3.5" /> Vegetariano</span>}
              {product.isSpicy && <span className="chip bg-danger/10 text-danger"><Flame className="h-3.5 w-3.5" /> Picante</span>}
            </div>
          )}
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{product.description}</p>
          <p className="mt-4 text-2xl font-bold">{eur(product.priceCents)}</p>

          <div className="mt-6">
            {product.optionGroups.length > 0 ? (
              <ProductPurchase productId={product.id} basePriceCents={product.priceCents} groups={product.optionGroups} />
            ) : (
              <AddToCart productId={product.id} productName={product.name} />
            )}
          </div>

          <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
            Entrega em ±{DELIVERY_MINUTES} min ou levantamento em {PICKUP_MINUTES} min. Preparado numa cozinha onde se usam
            glúten, ovos, leite, soja e frutos de casca rija — peça a ficha de alergénios no balcão ou por e-mail.
          </p>
        </div>
      </div>
    </div>
  );
}
