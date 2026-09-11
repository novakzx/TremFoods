import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Leaf, Flame, Clock, Bike, ShoppingBag } from 'lucide-react';
import { AddToCart } from '@/components/add-to-cart';
import { ProductPurchase } from './product-purchase';
import { prisma } from '@/infra/db';
import { eur } from '@/domains/shared-kernel/money';
import { DELIVERY_MINUTES, PICKUP_MINUTES } from '@/domains/delivery/delivery-policy';

export async function generateStaticParams() {
  return [];
}

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
  const product = await getProduct(params.slug).catch(() => null);
  if (!product) return {};
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
    <div className="container-app py-8 sm:py-10">
      <Link href="/cardapio" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Voltar ao cardápio
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden rounded-3xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
        </div>

        <div className="flex flex-col">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted">{product.category.name}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{product.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.isVegetarian && <span className="chip bg-success/10 text-success"><Leaf className="h-3.5 w-3.5" /> Vegetariano</span>}
            {product.isSpicy && <span className="chip bg-danger/10 text-danger"><Flame className="h-3.5 w-3.5" /> Picante</span>}
            {product.isNew && <span className="chip bg-ink/5 text-ink/70">Novo</span>}
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold">{eur(product.priceCents)}</span>
            <span className="text-sm text-muted">inclui IVA</span>
          </div>

          <div className="mt-7">
            {product.optionGroups.length > 0 ? (
              <ProductPurchase productId={product.id} basePriceCents={product.priceCents} groups={product.optionGroups} />
            ) : (
              <AddToCart productId={product.id} />
            )}
          </div>

          <dl className="mt-8 grid gap-3 border-t border-line pt-6 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent/15 text-accent-ink"><Clock className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} /></span>
              <div>
                <dt className="font-semibold">Levantamento</dt>
                <dd className="text-muted">pronto em {PICKUP_MINUTES} minutos</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent/15 text-accent-ink"><Bike className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} /></span>
              <div>
                <dt className="font-semibold">Entrega ao domicílio</dt>
                <dd className="text-muted">até {DELIVERY_MINUTES} minutos · {eur(250)} (grátis +{eur(2500)})</dd>
              </div>
            </div>
          </dl>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-4 text-[13px] leading-relaxed text-muted">
            <p className="mb-1 flex items-center gap-2 font-semibold text-ink"><ShoppingBag className="h-4 w-4" /> Alergénios e informação</p>
            Todos os artigos da casa são preparados na mesma cozinha e podem conter vestígios de glúten, ovos, leite, soja e frutos de casca rija.
            Consulte a ficha completa de alergénios no balcão ou por e-mail.
          </div>
        </div>
      </div>
    </div>
  );
}
