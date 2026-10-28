import Link from 'next/link';
import type { Metadata } from 'next';
import { Bike, Store, CreditCard, Timer } from 'lucide-react';
import { MenuBrowser, MenuCard } from '@/components/menu-browser';
import { listMenuProducts } from '@/domains/menu/catalog';
import { eur } from '@/domains/shared-kernel/money';
import { DELIVERY_MINUTES, FREE_DELIVERY_FROM_CENTS, PICKUP_MINUTES } from '@/domains/delivery/delivery-policy';

export const metadata: Metadata = {
  title: 'Hamburgueria em Almada — x-salada, picanha e petiscos',
  description:
    'Trem Food: hamburgueria em Almada com menu brasileiro e português. Hambúrgueres artesanais, picanha, petiscos e açaí. Aberto todos os dias, 06h30–00h00. Peça online.',
  alternates: { canonical: 'https://tremfood.pt/' },
  openGraph: { url: 'https://tremfood.pt/', title: 'Trem Food — Hamburgueria em Almada' },
};

export default async function HomePage() {
  const products = await listMenuProducts();
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  // Foto de destaque: a mesma de sempre (um produto do cardápio).
  const hero = products.find((p) => p.slug === 'x-salada-da-casa') ?? featured[0] ?? products[0];

  return (
    <div>
      {/* Hero curto: o que é, como pedir — e o cardápio logo a seguir */}
      <section className="border-b border-line bg-surface">
        <div className="container-app grid items-center gap-8 py-8 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Hambúrgueres, picanha e petiscos <span className="text-brand-deep">em Almada</span>.
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              Peça online e receba em casa ou levante na loja. Menu brasileiro e português, feito na hora.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/cardapio" className="btn-primary px-6">Ver o cardápio</Link>
              <Link href="/rastreamento" className="btn-secondary">Acompanhar pedido</Link>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
              <li className="flex items-center gap-1.5"><Bike className="h-4 w-4 text-brand-deep" /> Entrega ±{DELIVERY_MINUTES} min · grátis a partir de {eur(FREE_DELIVERY_FROM_CENTS)}</li>
              <li className="flex items-center gap-1.5"><Store className="h-4 w-4 text-brand-deep" /> Levantamento em {PICKUP_MINUTES} min</li>
              <li className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-brand-deep" /> Dinheiro, cartão, MB WAY ou Multibanco</li>
            </ul>
          </div>
          {hero && (
            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-line shadow-float">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.image} alt={hero.name} className="aspect-[5/4] w-full object-cover" fetchPriority="high" />
              </div>
              <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-float sm:left-6">
                <Timer className="h-5 w-5 text-brand" />
                <div className="leading-tight">
                  <p className="text-[13px] font-bold">Entrega média: {DELIVERY_MINUTES} min</p>
                  <p className="text-[11px] text-muted">Av. António José Gomes 6, Almada</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-app pt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">Destaques da casa</h2>
            <Link href="/cardapio" className="text-sm font-semibold text-ink/70 hover:text-brand-deep">Ver tudo</Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <MenuCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-app pt-8">
        <h2 className="mb-3 font-display text-xl font-bold tracking-tight">Cardápio</h2>
        <MenuBrowser products={products} />
      </section>
    </div>
  );
}
