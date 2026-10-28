'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { StatusTimeline } from '@/components/status-timeline';
import { apiGet } from '@/infra/http-client';
import { PushToggle } from '@/domains/notifications/push-toggle';
import { LiveCourierMap } from '@/components/live-courier-map';
import type { CourierPosition } from '@/domains/delivery/courier';

type TrackData = {
  number: string;
  status: string;
  statusLabel: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  estimatedMinutes: number;
  expectedAt: string | null;
  courier: CourierPosition;
  events: { status: string; label: string; at: string }[];
};

const FINAL = new Set(['DELIVERED', 'CANCELLED']);
const HOUR = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });

export function TrackingClient() {
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackData | null>(null);

  const lookup = useCallback(async (n: string, c: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiGet<TrackData>(`/api/tracking?number=${encodeURIComponent(n.trim().toUpperCase())}&code=${encodeURIComponent(c.trim())}`);
      if (r.ok) {
        setData(r.data);
        setNumber(r.data.number);
      } else {
        setData(null);
        setError(r.data.error?.message ?? 'Não foi possível encontrar o pedido.');
      }
    } catch {
      setError('Sem ligação. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) lookup(number, code);
  };

  // Link com ?number=TF-XXXXXX (notificações, e-mail): preenche e, com código, procura logo.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get('number');
    const c = q.get('code');
    if (n) setNumber(n.toUpperCase());
    if (n && c) {
      setCode(c);
      lookup(n, c);
    }
  }, [lookup]);

  // Atualização automática a cada 20 s enquanto o pedido está ativo.
  useEffect(() => {
    if (!data || FINAL.has(data.status)) return;
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const r = await apiGet<TrackData>(`/api/tracking?number=${encodeURIComponent(data.number)}&code=${encodeURIComponent(code)}`).catch(() => null);
      if (r?.ok) setData(r.data);
    }, 20_000);
    return () => clearInterval(t);
  }, [data, code]);

  const chip = data?.status === 'DELIVERED' ? 'bg-success/10 text-success' : data?.status === 'CANCELLED' ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand-deep';

  return (
    <div className="container-app max-w-2xl py-6 sm:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Acompanhar pedido</h1>
      <p className="mt-1 text-sm text-muted">
        Número do pedido (ex.: <span className="font-mono">TF-000123</span>) e os últimos 4 dígitos do telemóvel usado na encomenda.
      </p>

      <form onSubmit={search} className="card mt-5 grid gap-3 p-4 sm:grid-cols-[1fr_150px_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="track-number">N.º do pedido</label>
          <input
            id="track-number"
            className="input font-mono uppercase"
            placeholder="TF-000123"
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            maxLength={9}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="track-code">Últimos 4 dígitos</label>
          <input
            id="track-code"
            className="input font-mono"
            placeholder="6789"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            minLength={4}
            required
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Procurar
        </button>
      </form>

      {error && <p role="alert" className="alert-error mt-4">{error}</p>}

      {data && (
        <section className="card mt-4 p-4 sm:p-5" aria-live="polite">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-bold">{data.number}</p>
              <p className="text-[13px] text-muted">
                {data.deliveryMethod === 'DELIVERY' ? 'Entrega ao domicílio' : 'Levantamento na loja'}
                {data.expectedAt && !FINAL.has(data.status) && ` · previsto ~${HOUR.format(new Date(data.expectedAt))}`}
              </p>
            </div>
            <span className={`chip px-3 py-1 text-sm font-semibold ${chip}`}>{data.statusLabel}</span>
          </div>
          <StatusTimeline status={data.status} deliveryMethod={data.deliveryMethod} events={data.events} />
          {data.status === 'OUT_FOR_DELIVERY' && data.deliveryMethod === 'DELIVERY' && (
            <LiveCourierMap pollUrl={`/api/tracking?number=${encodeURIComponent(data.number)}&code=${encodeURIComponent(code.trim())}`} initial={data.courier} />
          )}
          {!FINAL.has(data.status) && <PushToggle orderNumber={data.number} code={code.trim()} />}
          <p className="mt-4 text-[13px] text-muted">Precisa de ajuda? Ligue <a href="tel:+351964994787" className="font-semibold text-ink">964 994 787</a>.</p>
        </section>
      )}
    </div>
  );
}
