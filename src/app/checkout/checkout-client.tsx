'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Banknote, CreditCard, Smartphone, Landmark, Loader2, CheckCircle2, Bike, Store } from 'lucide-react';
import { eur } from '@/domains/shared-kernel/money';
import { apiGet, apiPost } from '@/infra/http-client';
import { DELIVERY_FEE_CENTS, DELIVERY_MINUTES, FREE_DELIVERY_FROM_CENTS, PICKUP_MINUTES } from '@/domains/delivery/delivery-policy';

type CartItem = { id: string; qty: number; product: { id: string; slug: string; name: string; priceCents: number; image: string; available: boolean } };
type CartData = { count: number; subtotalCents: number; items: CartItem[] };
type Me = { user: { id: string; name: string; email: string; emailVerified: boolean } | null };
type Payment = { type: 'none' } | { type: 'stripe'; url: string } | { type: 'multibanco'; entity: string; reference: string; amountLabel: string; expiresLabel: string };
type OrderResult = { number: string; totalCents: number; totalLabel: string; paymentMethod: string; paymentLabel: string; etaMinutes: number; paymentMeta: unknown };

const PAYMENTS = [
  { id: 'CASH', label: 'Dinheiro', hint: 'Pague na entrega ou no balcão', icon: Banknote },
  { id: 'CARD', label: 'Cartão', hint: 'Visa, Mastercard — pagamento seguro', icon: CreditCard },
  { id: 'MBWAY', label: 'MB WAY', hint: 'Aprovação no telemóvel', icon: Smartphone },
  { id: 'MULTIBANCO', label: 'Referência Multibanco', hint: 'Entidade + referência para pagar no seu banco', icon: Landmark },
] as const;

export function CheckoutClient() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; payment: Payment; paymentLabel: string; paymentMethod: string } | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', addressStreet: '', addressNumber: '', addressCity: 'Almada', addressPostal: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [shopClosed, setShopClosed] = useState<'' | 'HOURS' | 'MANUAL'>('');

  useEffect(() => {
    (async () => {
      const [c, m, st] = await Promise.all([
        apiGet<CartData>('/api/cart'),
        apiGet<Me>('/api/auth/me'),
        apiGet<{ open: boolean; manualClosed: boolean }>('/api/shop-status'),
      ]);
      if (st.ok && !st.data.open) setShopClosed(st.data.manualClosed ? 'MANUAL' : 'HOURS');
      if (c.ok) setCart(c.data);
      if (m.ok && m.data.user) {
        setMe(m.data);
        setForm((f) => ({
          ...f,
          customerName: f.customerName || m.data.user!.name,
          customerEmail: f.customerEmail || m.data.user!.email,
        }));
      }
      setLoading(false);
    })();
  }, []);

  const fee = useMemo(() => {
    if (!cart) return 0;
    return deliveryMethod === 'PICKUP' ? 0 : cart.subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : DELIVERY_FEE_CENTS;
  }, [cart, deliveryMethod]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{ order: OrderResult; payment: Payment }>('/api/orders', {
        ...form,
        deliveryMethod,
        paymentMethod,
      });
      if (!r.ok) {
        const code = r.data.error?.code;
        if (code === 'EMAIL_NOT_VERIFIED') {
          setError('Confirme o seu e-mail antes de fazer o pedido. <a href="/verificar" class="underline font-bold">Ver e-mail de confirmação</a>.');
        } else if (code === 'UNAUTHORIZED') {
          setError('A sua sessão expirou. Inicie sessão novamente e volte a este passo.');
        } else if (code === 'CLOSED') {
          setShopClosed(r.data.error?.message?.includes('encerrados') ? 'MANUAL' : 'HOURS');
          setError(r.data.error?.message ?? 'Estamos fechados de momento.');
        } else {
          setError(r.data.error?.message ?? 'Não foi possível concluir o pedido. Tente novamente.');
        }
        return;
      }
      setDone({ number: r.data.order.number, payment: r.data.payment, paymentLabel: r.data.order.paymentLabel, paymentMethod: r.data.order.paymentMethod });

      if (r.data.payment.type === 'stripe' && r.data.payment.url) {
        window.location.href = r.data.payment.url;
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container-app py-16 text-center text-sm text-muted">A carregar…</div>
    );
  }

  if (done) {
    const mb = done.payment.type === 'multibanco' ? done.payment : null;
    return (
      <div className="container-app max-w-2xl py-12">
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Pedido {done.number} recebido</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Recebemos o seu pedido e já enviámos a confirmação por e-mail. Pode acompanhar cada passo
            na página do pedido ou em {`/rastreamento`}.
          </p>

          {mb && (
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-dashed border-ink/25 bg-paper p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Referência Multibanco</p>
              <p className="mt-3 flex justify-between text-sm"><span className="text-muted">Entidade</span><span className="font-mono font-bold">{mb.entity}</span></p>
              <p className="mt-1 flex justify-between text-sm"><span className="text-muted">Referência</span><span className="font-mono font-bold tracking-wider">{mb.reference}</span></p>
              <p className="mt-1 flex justify-between text-sm"><span className="text-muted">Valor</span><span className="font-bold">{mb.amountLabel}</span></p>
              <p className="mt-3 text-xs text-muted">Válida até {mb.expiresLabel}. O pedido avança assim que o pagamento for confirmado.</p>
            </div>
          )}

          {done.payment.type === 'none' && (
            <p className="mx-auto mt-4 max-w-sm rounded-xl bg-ink/5 px-4 py-3 text-[13px] text-ink/70">
              Pagamento em {done.paymentLabel.toLowerCase()}: {done.paymentMethod === 'CASH' ? 'pague na entrega ou no balcão.' : 'tratado na loja.'}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/pedido/${done.number}`} className="btn-primary">Acompanhar pedido</Link>
            <Link href="/cardapio" className="btn-secondary">Voltar ao cardápio</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-app max-w-xl py-16 text-center">
        <div className="card p-8">
          <h1 className="font-display text-xl font-bold">O carrinho está vazio</h1>
          <p className="mt-2 text-sm text-muted">Adicione artigos ao carrinho antes de finalizar.</p>
          <Link href="/cardapio" className="btn-primary mt-6">Ver o cardápio</Link>
        </div>
      </div>
    );
  }

  if (!me?.user) {
    return (
      <div className="container-app max-w-xl py-16 text-center">
        <div className="card p-8">
          <h1 className="font-display text-xl font-bold">Inicie sessão para continuar</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Para concluir a compra precisa de uma conta com e-mail verificado. O seu carrinho fica guardado.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/login?next=/checkout`} className="btn-primary">Iniciar sessão</Link>
            <Link href={`/registar?next=/checkout`} className="btn-secondary">Criar conta</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-8 sm:py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Finalizar pedido</h1>
      <p className="mt-1.5 text-sm text-muted">Entrega em {DELIVERY_MINUTES} min · Levantamento em {PICKUP_MINUTES} min</p>

      {shopClosed && (
        <div className="mt-6 rounded-2xl border border-danger/30 bg-paper px-4 py-3.5 text-sm">
          <p className="font-semibold text-ink">Estamos fechados de momento</p>
          <p className="mt-0.5 text-muted">
            {shopClosed === 'MANUAL'
              ? 'A loja está temporariamente encerrada. Volte em breve ou ligue 964 994 787.'
              : 'Abrimos todos os dias às 06h30. Pode deixar o carrinho guardado e voltar mais tarde.'}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-8">
          {/* 1. Entrega ou levantamento */}
          <section>
            <h2 className="mb-3 font-display text-base font-bold">Como quer receber?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { id: 'DELIVERY', label: 'Entrega ao domicílio', hint: `±${DELIVERY_MINUTES} min · taxa ${eur(fee)}`, icon: Bike },
                { id: 'PICKUP', label: 'Levantamento na loja', hint: `pronto em ${PICKUP_MINUTES} min · sem taxa`, icon: Store },
              ] as const).map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => setDeliveryMethod(o.id)}
                  aria-pressed={deliveryMethod === o.id}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${deliveryMethod === o.id ? 'border-ink bg-surface ring-2 ring-accent/40' : 'border-line bg-surface hover:border-ink/30'}`}
                >
                  <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${deliveryMethod === o.id ? 'bg-accent text-accent-ink' : 'bg-ink/5 text-ink/60'}`}>
                    <o.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* 2. Contacto e morada */}
          <section className="card p-5">
            <h2 className="mb-4 font-display text-base font-bold">Dados de contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customerName">Nome completo</label>
                <input id="customerName" required className="input" value={form.customerName} onChange={set('customerName')} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="customerPhone">Telemóvel</label>
                <input id="customerPhone" required inputMode="tel" className="input" placeholder="912 345 678" value={form.customerPhone} onChange={set('customerPhone')} autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="customerEmail">E-mail</label>
                <input id="customerEmail" type="email" required className="input" placeholder="nome@exemplo.pt" value={form.customerEmail} onChange={set('customerEmail')} autoComplete="email" />
                <p className="mt-1.5 text-xs text-muted">Enviaremos a confirmação e as atualizações do pedido para este e-mail.</p>
              </div>
            </div>
          </section>

          {deliveryMethod === 'DELIVERY' && (
            <section className="card p-5">
              <h2 className="mb-4 font-display text-base font-bold">Morada de entrega</h2>
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div>
                  <label className="label" htmlFor="addressStreet">Rua</label>
                  <input id="addressStreet" required className="input" value={form.addressStreet} onChange={set('addressStreet')} autoComplete="address-line1" />
                </div>
                <div>
                  <label className="label" htmlFor="addressNumber">Número</label>
                  <input id="addressNumber" required className="input" value={form.addressNumber} onChange={set('addressNumber')} autoComplete="address-line2" />
                </div>
                <div>
                  <label className="label" htmlFor="addressCity">Localidade</label>
                  <input id="addressCity" required className="input" value={form.addressCity} onChange={set('addressCity')} autoComplete="address-level2" />
                </div>
                <div>
                  <label className="label" htmlFor="addressPostal">Código postal</label>
                  <input id="addressPostal" required className="input" placeholder="2800-123" value={form.addressPostal} onChange={set('addressPostal')} autoComplete="postal-code" />
                </div>
              </div>
            </section>
          )}

          {/* 3. Pagamento */}
          <section className="card p-5">
            <h2 className="mb-4 font-display text-base font-bold">Pagamento</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PAYMENTS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPaymentMethod(p.id)}
                  aria-pressed={paymentMethod === p.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${paymentMethod === p.id ? 'border-ink bg-surface ring-2 ring-accent/40' : 'border-line bg-surface hover:border-ink/30'}`}
                >
                  <span className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg ${paymentMethod === p.id ? 'bg-accent text-accent-ink' : 'bg-ink/5 text-ink/60'}`}>
                    <p.icon className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* 4. Nota */}
          <section className="card p-5">
            <label className="label" htmlFor="note">Nota para a cozinha (opcional)</label>
            <textarea id="note" rows={3} maxLength={300} className="input resize-none" placeholder="Ex.: sem cebola no Trem Smash, molho à parte…" value={form.note} onChange={set('note')} />
            <p className="mt-1.5 text-xs text-muted">Até 300 caracteres. Não escreva dados sensíveis.</p>
          </section>
        </div>

        {/* Resumo */}
        <aside className="card sticky top-24 p-5 lg:top-28">
          <h2 className="font-display text-base font-bold">Resumo do pedido</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-muted"><span className="font-semibold text-ink">{i.qty}×</span> {i.product.name}</span>
                <span className="flex-none font-medium">{eur(i.product.priceCents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold">{eur(cart.subtotalCents)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">{deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'}</dt>
              <dd className={`font-semibold ${fee === 0 ? 'text-success' : ''}`}>{fee === 0 ? 'Grátis' : eur(fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-extrabold">{eur(cart.subtotalCents + fee)}</dd>
            </div>
          </dl>

          {error && <p className="mt-4 rounded-xl bg-danger/10 px-3.5 py-3 text-[13px] font-medium text-danger" dangerouslySetInnerHTML={{ __html: error }} />}

          <button type="submit" disabled={busy || !!shopClosed} className="btn-primary mt-5 w-full">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> A processar…</> : <>Confirmar pedido <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            Ao confirmar aceita os nossos <Link href="/termos" className="underline underline-offset-2">Termos e Condições</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}
