import Link from 'next/link';
import type { Metadata } from 'next';
import { Bike, ShoppingBag, CreditCard, MapPin, Clock, Timer, CheckCheck } from 'lucide-react';
import { MenuBrowser, type ProductView } from '@/components/menu-browser';
import { prisma } from '@/infra/db';
import { eur } from '@/domains/shared-kernel/money';

export const metadata: Metadata = {
  title: 'Hamburgueria em Almada — x-salada, picanha e petiscos',
  description:
    'Trem Food: hamburgueria em Almada com menu brasileiro e português. X-salada da casa, picanha com ovo frito, torresmo, kibe e taça de chocolate. Aberto todos os dias, 06h30–00h00.',
  alternates: { canonical: 'https://tremfood.pt/' },
  openGraph: { url: 'https://tremfood.pt/', title: 'Trem Food — Hamburgueria em Almada' },
};

async function getProducts(): Promise<ProductView[]> {
  try {
    const products = await prisma.product.findMany({
      where: { available: true },
      include: { category: { select: { id: true, name: true, slug: true, sort: true } }, _count: { select: { optionGroups: true } } },
      orderBy: { sort: 'asc' },
    });
    return products
      .sort((a, b) => (a.category?.sort ?? 0) - (b.category?.sort ?? 0))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description ?? '',
        priceCents: p.priceCents,
        image: p.image,
        available: p.available,
        isFeatured: p.isFeatured,
        isNew: p.isNew,
        isVegetarian: p.isVegetarian,
        isSpicy: p.isSpicy,
        category: p.category,
        categoryId: p.categoryId,
        hasOptions: (p._count?.optionGroups ?? 0) > 0,
      }));
  } catch (error) {
    console.error('[HomePage] Error loading products:', error);
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const hero = products.find((p) => p.slug === 'x-salada-da-casa') ?? featured[0];

  return (
    <div>
      {/* Hero — layout limpo, tipo Wolt: texto à esquerda, prato à direita */}
      <section className="border-b border-line bg-surface">
        <div className="container-app grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[13px] font-semibold text-success">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" /> Aberto todos os dias · 06h30–00h00
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              <span className="text-brand">X-salada, picanha</span> e petiscos à moda da casa.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              Menu brasileiro e português: x-salada com carne 160&nbsp;g, picanha com ovo frito,
              torresmo crocante e kibe — tudo feito na loja, em Almada. Entregamos sem contacto
              em 40 minutos, ou levante em 20.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cardapio" className="btn-primary px-7 text-base">
                Ver o cardápio
              </Link>
              <Link href="/rastreamento" className="btn-secondary bg-paper">
                Acompanhar pedido
              </Link>
            </div>
            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:text-left">
              <div className="rounded-2xl border border-line bg-paper/60 p-3">
                <dt className="text-xs text-muted">Entrega</dt>
                <dd className="mt-1 text-sm font-bold">{eur(250)}<span className="block text-[11px] font-medium text-muted">grátis +25&nbsp;€</span></dd>
              </div>
              <div className="rounded-2xl border border-line bg-paper/60 p-3">
                <dt className="text-xs text-muted">Levantamento</dt>
                <dd className="mt-1 text-sm font-bold">20 min<span className="block text-[11px] font-medium text-muted">sem taxa</span></dd>
              </div>
              <div className="rounded-2xl border border-line bg-paper/60 p-3">
                <dt className="text-xs text-muted">Preço médio</dt>
                <dd className="mt-1 text-sm font-bold">10–15&nbsp;€<span className="block text-[11px] font-medium text-muted">por pessoa</span></dd>
              </div>
              <div className="rounded-2xl border border-line bg-paper/60 p-3">
                <dt className="text-xs text-muted">Pagamento</dt>
                <dd className="mt-1 text-sm font-bold">4 formas<span className="block text-[11px] font-medium text-muted">dinheiro · cartão · MB&nbsp;WAY · Multibanco</span></dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-line shadow-float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero?.image ?? '/img/items/real-x-salada.jpg'} alt={`${hero?.name ?? 'X-salada da casa'}`} className="aspect-[5/4] w-full object-cover" fetchPriority="high" />
            </div>
            <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-float sm:left-6">
              <Timer className="h-5 w-5 text-brand" />
              <div className="leading-tight">
                <p className="text-[13px] font-bold">Entrega média: 40 min</p>
                <p className="text-[11px] text-muted">Av. António José Gomes 6, Almada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destaques */}
      {featured.length > 0 && (
        <section className="container-app pt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight">Destaques da casa</h2>
            <Link href="/cardapio" className="text-sm font-semibold text-ink/70 hover:text-brand">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((p) => (
              <MenuCardInline key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* A casa — fotografia real do balcão */}
      <section className="container-app pt-14">
        <div className="card grid overflow-hidden sm:grid-cols-2">
          <div className="relative min-h-[260px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/items/real-equipa.jpg" alt="Equipa Trem Food a servir torresmo e pratos na loja" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold tracking-tight">Do balcão para a sua mesa</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Abrimos todos os dias às 06h30: café ao início da manhã, petiscos ao almoço
              e hambúrgueres até à meia-noite, tudo feito na mesma chapa.
              Pode comer no local, pedir recolha móvel sem sair do carro
              ou receber em casa com entrega sem contacto.
            </p>
            <p className="mt-3 text-[13px] text-muted">
              Av. António José Gomes 6, Almada · <a href="tel:+351964994787" className="font-semibold text-ink underline underline-offset-2">964 994 787</a>
            </p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="container-app pt-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShoppingBag, t: '1. Escolha no cardápio', d: 'Monte o seu pedido e adicione ao carrinho. Sem conta obrigatória para começar.' },
            { icon: CreditCard, t: '2. Pague como quiser', d: 'Dinheiro na entrega, cartão, MB WAY ou referência Multibanco.' },
            { icon: Bike, t: '3. Acompanhe em tempo real', d: 'Recebido, em preparação, saiu para entrega — siga cada passo no site.' },
          ].map((s) => (
            <div key={s.t} className="card card-hover flex gap-4 p-5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-[15px] font-bold">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Entrega e recolha */}
      <section className="container-app pt-16">
        <div className="card grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-success/10 text-success">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Entrega e recolha</h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
                Entrega sem contacto à porta, em Almada e arredores — taxa de {eur(250)},
                gratuita em pedidos a partir de {eur(2500)}. Alternativas sem taxa:
                levantamento no balcão ou recolha móvel, sem sair do carro.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] font-medium text-ink/70">
            <span className="chip bg-ink/5"><CheckCheck className="h-3.5 w-3.5" /> Pedido pronto em 20 min</span>
            <span className="chip bg-ink/5"><Clock className="h-3.5 w-3.5" /> Todos os dias · 06h30–00h00</span>
          </div>
        </div>
      </section>

      {/* Cardápio completo na página inicial, como fazem Wolt/Deliveroo */}
      <section className="container-app pb-4 pt-16">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold tracking-tight">Cardápio</h2>
          <p className="mt-1 text-sm text-muted">Tudo o que fazemos, com pesquisa e filtros.</p>
        </div>
        <MenuBrowser products={products} />
      </section>
    </div>
  );
}

function MenuCardInline({ p }: { p: ProductView }) {
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <a href={`/cardapio/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F5EBDB]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]" />
      </a>
      <div className="flex flex-1 flex-col p-4">
        <a href={`/cardapio/${p.slug}`} className="font-display text-[15px] font-bold leading-snug tracking-tight hover:underline underline-offset-2">{p.name}</a>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">{p.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-brand">{eur(p.priceCents)}</span>
          <a href={`/cardapio/${p.slug}`} className="text-[13px] font-semibold text-ink/60 hover:text-brand">Detalhes</a>
        </div>
      </div>
    </article>
  );
}
