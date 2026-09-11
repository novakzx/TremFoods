'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, PackageCheck } from 'lucide-react';
import { StatusTimeline } from '@/components/status-timeline';
import { apiGet } from '@/infra/http-client';
import { PushToggle } from '@/domains/notifications/push-toggle';

type TrackData = {
  number: string;
  status: string;
  statusLabel: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  estimatedMinutes: number;
  events: { status: string; label: string; at: string }[];
};

export function TrackingClient() {
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackData | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiGet<TrackData>(`/api/tracking?number=${encodeURIComponent(number.trim().toUpperCase())}&code=${encodeURIComponent(code.trim())}`);
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
  };

  // Se veio de um link com ?number=TF-XXXXXX, preenche e procura automaticamente.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get('number');
    if (n) {
      setNumber(n.toUpperCase());
      const c = q.get('code');
      if (c) {
        setCode(c);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setTimeout(() => {
          setBusy(true);
          apiGet<TrackData>(`/api/tracking?number=${encodeURIComponent(n.toUpperCase())}&code=${encodeURIComponent(c)}`).then((r) => {
            setBusy(false);
            if (r.ok) setData(r.data);
            else setError(r.data.error?.message ?? 'Não foi possível encontrar o pedido.');
          });
        }, 50);
      }
    }
  }, []);

  // Atualização automática a cada 20s enquanto há um pedido ativo.
  useEffect(() => {
    if (!data || data.status === 'DELIVERED' || data.status === 'CANCELLED') return;
    const t = setInterval(async () => {
      const r = await apiGet<TrackData>(`/api/tracking?number=${encodeURIComponent(data.number)}&code=${encodeURIComponent(code)}`).catch(() => null);
      if (r?.ok) setData(r.data);
    }, 20_000);
    return () => clearInterval(t);
  }, [data, code]);

  return (
    <div className="container-app max-w-2xl py-8 sm:py-10">
      <header className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Acompanhar pedido</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Introduza o número de pedido (ex.: <span className="font-mono font-semibold">TF-000123</span>) e os últimos 4 dígitos do telemóvel usado na encomenda.
        </p>
      </header>

      <form onSubmit={search} className="card mt-8 grid gap-3 p-5 sm:grid-cols-[1fr_180px_auto]">
        <div>
          <label className="label" htmlFor="track-number">Número do pedido</label>
          <input
            id="track-number"
            className="input font-mono uppercase"
            placeholder="TF-000123"
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            maxLength={9}
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
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            required
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary self-end">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Acompanhar
        </button>
      </form>

      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}

      {data && (
        <section className="card fade-up mt-6 p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="font-display text-lg font-extrabold">{data.number}</p>
              <p className="text-[13px] text-muted">
                {data.deliveryMethod === 'DELIVERY' ? 'Entrega ao domicílio' : 'Levantamento na loja'} · chegada estimada em {data.estimatedMinutes} min
              </p>
            </div>
            <span className="chip bg-success/10 px-3.5 py-1.5 text-sm font-bold text-success">{data.statusLabel}</span>
          </div>
          <div className="mt-6">
            <StatusTimeline status={data.status} deliveryMethod={data.deliveryMethod} events={data.events.map((e) => ({ status: e.status, at: e.at }))} />
          </div>
          <PushToggle orderNumber={data.number} code={code.trim()} />
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-paper px-3.5 py-3 text-[13px] leading-relaxed text-muted">
            <PackageCheck className="mt-0.5 h-4 w-4 flex-none text-accent" />
            <span>O estado é atualizado automaticamente pela cozinha. Se precisar de ajuda, ligue-nos: <span className="whitespace-nowrap font-semibold text-ink">964 994 787</span>.</span>
          </p>
        </section>
      )}
    </div>
  );
}
