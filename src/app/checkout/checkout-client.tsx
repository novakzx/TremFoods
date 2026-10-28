'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, CreditCard, Smartphone, Landmark, Loader2, CheckCircle2, Bike, Store } from 'lucide-react';
import { eur } from '@/domains/shared-kernel/money';
import { apiGet, apiPost, emitCartChange } from '@/infra/http-client';
import { DELIVERY_MINUTES, PICKUP_MINUTES, deliveryFeeFor } from '@/domains/delivery/delivery-policy';

type CartItem = { id: string; qty: number; unitPriceCents: number; options: { name: string }[]; product: { id: string; name: string; available: boolean } };
type CartData = { count: number; subtotalCents: number; items: CartItem[] };
type Me = { user: { id: string; name: string; email: string; emailVerified: boolean } | null };
type Payment = { type: 'none' } | { type: 'stripe'; url: string } | { type: 'multibanco'; entity: string; reference: string; amountLabel: string; expiresLabel: string };
type OrderResult = { number: string; totalLabel: string; paymentMethod: string; paymentLabel: string; etaMinutes: number };
type Done = { order: OrderResult; payment: Payment; paymentFallback: boolean };

const PAYMENTS = [
  { id: 'CASH', label: 'Dinheiro', hint: 'Na entrega ou no balcão', icon: Banknote },
  { id: 'CARD', label: 'Cartão', hint: 'Visa, Mastercard', icon: CreditCard },
  { id: 'MBWAY', label: 'MB WAY', hint: 'Aprovação no telemóvel', icon: Smartphone },
  { id: 'MULTIBANCO', label: 'Multibanco', hint: 'Entidade e referência', icon: Landmark },
] as const;

export function CheckoutClient() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [me, setMe] = useState<Me['user']>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; verify?: boolean; login?: boolean } | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', addressStreet: '', addressNumber: '', addressCity: 'Almada', addressPostal: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [shopClosed, setShopClosed] = useState<'' | 'HOURS' | 'MANUAL'>('');

  useEffect(() => {
    (async () => {
      try {
        const [c, m, st] = await Promise.all([
          apiGet<CartData>('/api/cart'),
          apiGet<Me>('/api/auth/me'),
          apiGet<{ open: boolean; manualClosed: boolean }>('/api/shop-status'),
        ]);
        if (st.ok && !st.data.open) setShopClosed(st.data.manualClosed ? 'MANUAL' : 'HOURS');
        if (c.ok) setCart(c.data);
        else setLoadError(true);
        const user = m.ok ? m.data.user : null;
        if (user) {
          setMe(user);
          setForm((f) => ({ ...f, customerName: f.customerName || user.name, customerEmail: f.customerEmail || user.email }));
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fee = cart ? deliveryFeeFor(cart.subtotalCents, deliveryMethod) : 0;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{ order: OrderResult; payment: Payment; paymentFallback?: boolean }>('/api/orders', {
        ...form,
        deliveryMethod,
        paymentMethod,
      });
      if (!r.ok) {
        const code = r.data.error?.code;
        const message = r.data.error?.message ?? 'Não foi possível concluir o pedido. Tente novamente.';
        if (code === 'EMAIL_NOT_VERIFIED') setError({ message, verify: true });
        else if (code === 'UNAUTHORIZED') setError({ message: 'A sua sessão expirou. Inicie sessão novamente.', login: true });
        else {
          if (code === 'CLOSED') setShopClosed(message.includes('encerrados') ? 'MANUAL' : 'HOURS');
          setError({ message });
        }
        return;
      }
      emitCartChange();
      if (r.data.payment.type === 'stripe' && r.data.payment.url) {
        window.location.href = r.data.payment.url;
        return;
      }
      setDone({ order: r.data.order, payment: r.data.payment, paymentFallback: Boolean(r.data.paymentFallback) });
      window.scrollTo({ top: 0 });
    } catch {
      setError({ message: 'Sem ligação ao servidor. Verifique a internet e tente novamente.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted">A carregar…</p>;
  }

  if (done) {
    const mb = done.payment.type === 'multibanco' ? done.payment : null;
    return (
      <div className="container-app max-w-xl py-10">
        <div className="card p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">Pedido {done.order.number} recebido</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Enviámos a confirmação por e-mail. Tempo estimado: {done.order.etaMinutes} minutos.
          </p>

          {done.paymentFallback && (
            <p className="alert-info mt-4 text-left">
              O pagamento online não está disponível neste momento — o pedido ficou para pagar em dinheiro {deliveryMethod === 'DELIVERY' ? 'na entrega' : 'no balcão'}.
            </p>
          )}

          {mb && (
            <dl className="mx-auto mt-5 max-w-xs space-y-1.5 rounded-xl border border-line bg-paper p-4 text-left text-sm">
              <div className="flex justify-between"><dt className="text-muted">Entidade</dt><dd className="font-mono font-bold">{mb.entity}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Referência</dt><dd className="font-mono font-bold tracking-wider">{mb.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Valor</dt><dd className="font-bold">{mb.amountLabel}</dd></div>
              <p className="pt-1 text-xs text-muted">Válida até {mb.expiresLabel}.</p>
            </dl>
          )}

          {done.payment.type === 'none' && done.order.paymentMethod === 'CASH' && !done.paymentFallback && (
            <p className="mt-4 text-sm text-muted">Pagamento em dinheiro {deliveryMethod === 'DELIVERY' ? 'na entrega' : 'no balcão'}.</p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={`/pedido/${done.order.number}`} className="btn-primary">Acompanhar pedido</Link>
            <Link href="/cardapio" className="btn-secondary">Voltar ao cardápio</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container-app max-w-md py-16">
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-bold">Não foi possível carregar o checkout</p>
          <button onClick={() => window.location.reload()} className="btn-secondary mx-auto mt-5">Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-app max-w-md py-16">
        <div className="card p-8 text-center">
          <h1 className="font-display text-xl font-bold">O carrinho está vazio</h1>
          <Link href="/cardapio" className="btn-primary mt-5">Ver o cardápio</Link>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="container-app max-w-md py-16">
        <div className="card p-8 text-center">
          <h1 className="font-display text-xl font-bold">Entre para finalizar</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">Precisa de uma conta com e-mail confirmado. O seu carrinho fica guardado.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/login?next=/checkout" className="btn-primary">Entrar</Link>
            <Link href="/registar?next=/checkout" className="btn-secondary">Criar conta</Link>
          </div>
        </div>
      </div>
    );
  }

  const option = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${active ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-ink/30'}`;

  return (
    <div className="container-app py-6 sm:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Finalizar pedido</h1>

      {!me.emailVerified && (
        <p className="alert-info mt-4">
          Confirme o seu e-mail antes de fazer o pedido. <Link href="/verificar" className="font-semibold underline">Reenviar confirmação</Link>
        </p>
      )}

      {shopClosed && (
        <p className="alert-error mt-4">
          {shopClosed === 'MANUAL'
            ? 'Estamos temporariamente encerrados. Volte em breve ou ligue 964 994 787.'
            : 'Estamos fechados de momento. Abrimos todos os dias às 06h30 — o carrinho fica guardado.'}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 font-semibold">Como quer receber?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { id: 'DELIVERY', label: 'Entrega', hint: `±${DELIVERY_MINUTES} min · ${deliveryFeeFor(cart.subtotalCents, 'DELIVERY') === 0 ? 'grátis' : eur(deliveryFeeFor(cart.subtotalCents, 'DELIVERY'))}`, icon: Bike },
                { id: 'PICKUP', label: 'Levantamento na loja', hint: `pronto em ${PICKUP_MINUTES} min · sem taxa`, icon: Store },
              ] as const).map((o) => (
                <button type="button" key={o.id} role="radio" aria-checked={deliveryMethod === o.id} onClick={() => setDeliveryMethod(o.id)} className={option(deliveryMethod === o.id)}>
                  <o.icon className="h-5 w-5 flex-none text-ink/70" />
                  <span>
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="card p-4 sm:p-5">
            <legend className="sr-only">Dados de contacto</legend>
            <p className="mb-3 font-semibold">Contacto</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customerName">Nome</label>
                <input id="customerName" required minLength={2} maxLength={80} className="input" value={form.customerName} onChange={set('customerName')} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="customerPhone">Telemóvel</label>
                <input id="customerPhone" required type="tel" inputMode="tel" minLength={9} maxLength={20} className="input" placeholder="912 345 678" value={form.customerPhone} onChange={set('customerPhone')} autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="customerEmail">E-mail para a confirmação</label>
                <input id="customerEmail" type="email" required maxLength={160} className="input" value={form.customerEmail} onChange={set('customerEmail')} autoComplete="email" />
              </div>
            </div>
          </fieldset>

          {deliveryMethod === 'DELIVERY' && (
            <fieldset className="card p-4 sm:p-5">
              <legend className="sr-only">Morada de entrega</legend>
              <p className="mb-3 font-semibold">Morada de entrega</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div>
                  <label className="label" htmlFor="addressStreet">Rua</label>
                  <input id="addressStreet" required maxLength={120} className="input" value={form.addressStreet} onChange={set('addressStreet')} autoComplete="address-line1" />
                </div>
                <div>
                  <label className="label" htmlFor="addressNumber">N.º / andar</label>
                  <input id="addressNumber" required maxLength={20} className="input" value={form.addressNumber} onChange={set('addressNumber')} autoComplete="address-line2" />
                </div>
                <div>
                  <label className="label" htmlFor="addressCity">Localidade</label>
                  <input id="addressCity" required maxLength={80} className="input" value={form.addressCity} onChange={set('addressCity')} autoComplete="address-level2" />
                </div>
                <div>
                  <label className="label" htmlFor="addressPostal">Código postal</label>
                  <input id="addressPostal" required maxLength={20} className="input" placeholder="2800-123" value={form.addressPostal} onChange={set('addressPostal')} autoComplete="postal-code" />
                </div>
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-2 font-semibold">Pagamento</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAYMENTS.map((p) => (
                <button type="button" key={p.id} role="radio" aria-checked={paymentMethod === p.id} onClick={() => setPaymentMethod(p.id)} className={option(paymentMethod === p.id)}>
                  <p.icon className="h-5 w-5 flex-none text-ink/70" />
                  <span>
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="block text-xs text-muted">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="note">Nota para a cozinha (opcional)</label>
            <textarea id="note" rows={2} maxLength={300} className="input resize-none" placeholder="Ex.: sem cebola, molho à parte…" value={form.note} onChange={set('note')} />
          </div>
        </div>

        <aside className="card p-4 sm:p-5 lg:sticky lg:top-20">
          <p className="font-semibold">Resumo</p>
          <ul className="mt-3 space-y-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-muted">
                  <span className="font-semibold text-ink">{i.qty}×</span> {i.product.name}
                  {i.options.length > 0 && <span className="block text-xs">{i.options.map((o) => o.name).join(' · ')}</span>}
                </span>
                <span className="flex-none">{eur(i.unitPriceCents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{eur(cart.subtotalCents)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">{deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'}</dt>
              <dd>{fee === 0 ? 'Grátis' : eur(fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{eur(cart.subtotalCents + fee)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="alert-error mt-4">
              {error.message}{' '}
              {error.verify && <Link href="/verificar" className="font-bold underline">Reenviar confirmação</Link>}
              {error.login && <Link href="/login?next=/checkout" className="font-bold underline">Entrar</Link>}
            </p>
          )}

          <button type="submit" disabled={busy || !!shopClosed} className="btn-primary mt-4 w-full">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> A enviar…</> : <>Confirmar pedido · {eur(cart.subtotalCents + fee)}</>}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">
            Ao confirmar aceita os <Link href="/termos" className="underline underline-offset-2">Termos e Condições</Link>.
          </p>
        </aside>
      </form>
    </div>
  );
}
