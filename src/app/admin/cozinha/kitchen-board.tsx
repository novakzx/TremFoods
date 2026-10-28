'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bike, Store, Volume2, VolumeX, Maximize, ArrowLeft, Loader2, QrCode, StickyNote, WifiOff, X, Copy, Check } from 'lucide-react';
import type { KitchenOrderView } from '@/domains/admin/order-ops';
import { EXTRA_MINUTES_OPTIONS, PICKUP_MINUTES, DELIVERY_MINUTES } from '@/domains/delivery/delivery-policy';
import { apiGet, apiPatch, apiPost } from '@/infra/http-client';

type KitchenData = {
  serverTime: string;
  eta: { queue: number; extraMinutes: number; pickup: number; delivery: number };
  orders: KitchenOrderView[];
};

const POLL_MS = 10_000;
const REMINDER_MS = 30_000;
const CLOCK = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });

const COLUMNS = [
  { status: 'RECEIVED', title: 'Novos' },
  { status: 'PREPARING', title: 'Em preparação' },
  { status: 'OUT_FOR_DELIVERY', title: 'Prontos / a caminho' },
] as const;

function nextAction(o: KitchenOrderView): { status: string; label: string } | null {
  if (o.status === 'RECEIVED') return { status: 'PREPARING', label: 'Começar' };
  if (o.status === 'PREPARING') return { status: 'OUT_FOR_DELIVERY', label: o.deliveryMethod === 'PICKUP' ? 'Pronto para levantar' : 'Saiu para entrega' };
  if (o.status === 'OUT_FOR_DELIVERY') return { status: 'DELIVERED', label: o.deliveryMethod === 'PICKUP' ? 'Levantado' : 'Entregue' };
  return null;
}

// Som de aviso gerado no browser (sem ficheiros). Os browsers só deixam tocar
// depois de um toque no ecrã — por isso o botão "Iniciar".
function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    if (!ctx.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx.current = new Ctor();
    }
    void ctx.current.resume();
  }, []);
  const play = useCallback(() => {
    const c = ctx.current;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    [880, 1175, 1568].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const start = t + i * 0.18;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }, []);
  return { unlock, play };
}

// Mantém o ecrã do tablet ligado enquanto a página está visível.
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* sem bateria/permissão — o ecrã pode apagar-se */
      }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}

export function KitchenBoard() {
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(true);
  const [data, setData] = useState<KitchenData | null>(null);
  const [offline, setOffline] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [courierFor, setCourierFor] = useState<KitchenOrderView | null>(null);
  const [, setTick] = useState(0);
  const known = useRef<Set<string> | null>(null);
  const clockOffset = useRef(0);
  const { unlock, play } = useChime();
  const soundOn = started && sound;
  useWakeLock(started);

  const now = () => Date.now() + clockOffset.current;

  const load = useCallback(async () => {
    try {
      const r = await apiGet<KitchenData>('/api/admin/kitchen');
      if (!r.ok) {
        setOffline(true);
        return;
      }
      setOffline(false);
      clockOffset.current = new Date(r.data.serverTime).getTime() - Date.now();
      const ids = r.data.orders.map((o) => o.id);
      if (known.current) {
        const arrived = ids.filter((id) => !known.current!.has(id));
        if (arrived.length) {
          setFresh((f) => new Set([...f, ...arrived]));
          if (soundOn) play();
        }
      }
      known.current = new Set(ids);
      setData(r.data);
    } catch {
      setOffline(true);
    }
  }, [play, soundOn]);

  useEffect(() => {
    void load();
    const t = setInterval(load, POLL_MS);
    const tick = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => {
      clearInterval(t);
      clearInterval(tick);
    };
  }, [load]);

  const pending = data?.orders.filter((o) => o.status === 'RECEIVED').length ?? 0;

  // Lembrete: enquanto houver pedidos por começar, o som repete.
  useEffect(() => {
    if (!soundOn || pending === 0) return;
    const t = setInterval(play, REMINDER_MS);
    return () => clearInterval(t);
  }, [soundOn, pending, play]);

  useEffect(() => {
    document.title = pending ? `(${pending}) Cozinha · Trem Food` : 'Cozinha · Trem Food';
  }, [pending]);

  const start = () => {
    unlock();
    setStarted(true);
    play();
    if (window.innerWidth < 1400) void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const advance = async (o: KitchenOrderView) => {
    const action = nextAction(o);
    if (!action || busyId) return;
    setBusyId(o.id);
    setError(null);
    try {
      const r = await apiPost(`/api/admin/orders/${o.id}/status`, { status: action.status });
      if (!r.ok) setError(`${o.number}: ${r.data.error?.message ?? 'não foi possível atualizar.'}`);
      setFresh((f) => {
        const n = new Set(f);
        n.delete(o.id);
        return n;
      });
      await load();
    } catch {
      setError('Sem ligação — o estado não foi alterado.');
    } finally {
      setBusyId(null);
    }
  };

  const setExtra = async (minutes: number) => {
    const r = await apiPatch<{ eta: KitchenData['eta'] }>('/api/admin/kitchen', { extraMinutes: minutes }).catch(() => null);
    if (r?.ok) setData((d) => (d ? { ...d, eta: r.data.eta } : d));
    else setError('Não foi possível alterar o tempo extra.');
  };

  const columns = useMemo(
    () => COLUMNS.map((c) => ({ ...c, orders: (data?.orders ?? []).filter((o) => o.status === c.status) })),
    [data],
  );

  return (
    <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#17110A] text-white">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white" aria-label="Voltar ao painel">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-xl font-bold">Cozinha</h1>
        <span className="font-mono text-lg tabular-nums text-white/80">{CLOCK.format(new Date(now()))}</span>
        {data && (
          <span className="text-sm text-white/60">
            Novos pedidos: entrega <b className="text-white">~{data.eta.delivery} min</b> · levantamento <b className="text-white">~{data.eta.pickup} min</b>
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="Tempo extra por a cozinha estar cheia">
            <span className="px-2 text-xs text-white/60">Cozinha cheia</span>
            {EXTRA_MINUTES_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setExtra(m)}
                aria-pressed={data?.eta.extraMinutes === m}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${data?.eta.extraMinutes === m ? 'bg-brand text-ink' : 'text-white/80 hover:bg-white/10'}`}
              >
                {m === 0 ? 'Normal' : `+${m}`}
              </button>
            ))}
          </div>
          <button onClick={() => { unlock(); setSound(!sound); }} className="rounded-lg p-2.5 text-white/80 hover:bg-white/10" aria-label={sound ? 'Desligar som' : 'Ligar som'} aria-pressed={sound}>
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-danger" />}
          </button>
          <button onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})} className="rounded-lg p-2.5 text-white/80 hover:bg-white/10" aria-label="Ecrã inteiro">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </header>

      {offline && (
        <p role="alert" className="flex items-center gap-2 bg-danger px-4 py-2 text-sm font-semibold">
          <WifiOff className="h-4 w-4" /> Sem ligação ao servidor — a tentar de novo. Os pedidos novos podem não aparecer.
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center justify-between gap-2 bg-danger/90 px-4 py-2 text-sm font-semibold">
          {error}
          <button onClick={() => setError(null)} aria-label="Fechar aviso"><X className="h-4 w-4" /></button>
        </p>
      )}

      {/* Colunas */}
      <main className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 md:grid-cols-3 md:overflow-hidden">
        {columns.map((col) => (
          <section key={col.status} className="flex min-h-0 flex-col rounded-2xl bg-white/[0.04]" aria-label={col.title}>
            <h2 className="flex items-center justify-between px-4 py-3 text-sm font-bold uppercase tracking-wider text-white/70">
              {col.title}
              <span className={`rounded-full px-2.5 py-0.5 text-sm ${col.status === 'RECEIVED' && col.orders.length ? 'bg-brand text-ink' : 'bg-white/10 text-white'}`}>{col.orders.length}</span>
            </h2>
            <ul className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
              {col.orders.length === 0 && <li className="py-10 text-center text-sm text-white/40">Sem pedidos</li>}
              {col.orders.map((o) => (
                <li key={o.id}>
                  <KitchenCard
                    order={o}
                    nowMs={now()}
                    fresh={fresh.has(o.id)}
                    busy={busyId === o.id}
                    onAdvance={() => advance(o)}
                    onCourier={() => setCourierFor(o)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {!started && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-6">
          <div className="max-w-sm rounded-2xl bg-surface p-6 text-center text-ink">
            <p className="font-display text-2xl font-bold">Ecrã da cozinha</p>
            <p className="mt-2 text-sm text-muted">Toca um som a cada pedido novo (e repete até alguém o começar) e mantém o ecrã do tablet ligado.</p>
            <button onClick={start} className="btn-primary mt-5 w-full text-base">Iniciar</button>
          </div>
        </div>
      )}

      {courierFor && <CourierDialog order={courierFor} onClose={() => setCourierFor(null)} />}
    </div>
  );
}

function minutesBetween(fromIso: string, nowMs: number) {
  return Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 60_000));
}

function KitchenCard({ order: o, nowMs, fresh, busy, onAdvance, onCourier }: {
  order: KitchenOrderView;
  nowMs: number;
  fresh: boolean;
  busy: boolean;
  onAdvance: () => void;
  onCourier: () => void;
}) {
  const action = nextAction(o);
  const waited = minutesBetween(o.createdAt, nowMs);
  const target = o.etaMinutes ?? (o.deliveryMethod === 'PICKUP' ? PICKUP_MINUTES : DELIVERY_MINUTES);
  // Na cozinha conta o tempo desde o pedido; a caminho, há quanto tempo saiu.
  const shown = o.status === 'OUT_FOR_DELIVERY' ? minutesBetween(o.statusSince, nowMs) : waited;
  const ratio = waited / target;
  const timerClass =
    o.status === 'OUT_FOR_DELIVERY' ? 'bg-ink/10 text-ink' : ratio >= 1 ? 'bg-danger text-white' : ratio >= 0.6 ? 'bg-accent text-ink' : 'bg-success text-white';
  const courierLive = o.courierSeenAt && nowMs - new Date(o.courierSeenAt).getTime() < 2 * 60_000;

  return (
    <article className={`rounded-xl bg-surface p-3.5 text-ink ${fresh && o.status === 'RECEIVED' ? 'ring-4 ring-brand' : ''}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-extrabold leading-none">
            #{Number(o.number.replace('TF-', ''))}
            {fresh && o.status === 'RECEIVED' && <span className="rounded bg-brand px-1.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide">Novo</span>}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            {o.deliveryMethod === 'DELIVERY' ? <Bike className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            {o.deliveryMethod === 'DELIVERY' ? 'Entrega' : 'Levantamento'} · {o.customerName.split(' ')[0]}
          </p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-center font-mono text-lg font-bold leading-none tabular-nums ${timerClass}`} title={o.status === 'OUT_FOR_DELIVERY' ? 'Minutos desde que saiu' : `Minutos desde o pedido (previsto: ${target} min)`}>
          {shown}′
          {o.status !== 'OUT_FOR_DELIVERY' && ratio >= 1 && <span className="block text-[10px] font-sans uppercase">atrasado</span>}
        </span>
      </header>

      <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
        {o.items.map((i, idx) => (
          <li key={idx} className="text-[17px] leading-snug">
            <span className="font-extrabold">{i.qty}×</span> <span className="font-semibold">{i.name}</span>
            {i.options.length > 0 && <span className="block pl-6 text-sm font-medium text-brand-deep">+ {i.options.join(', ')}</span>}
          </li>
        ))}
      </ul>
      {o.note && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-accent/30 px-2.5 py-2 text-sm font-semibold">
          <StickyNote className="mt-0.5 h-4 w-4 flex-none" /> {o.note}
        </p>
      )}

      {o.courierPath && (
        <button onClick={onCourier} className="mt-3 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-sm font-semibold hover:bg-paper">
          <span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Link do estafeta</span>
          <span className={courierLive ? 'text-success' : 'text-muted'}>{courierLive ? '● a partilhar localização' : 'sem localização'}</span>
        </button>
      )}

      {action && (
        <button onClick={onAdvance} disabled={busy} className={`btn mt-3 w-full text-base ${o.status === 'RECEIVED' ? 'bg-brand text-ink hover:bg-brand-deep' : 'bg-ink text-white hover:bg-ink/85'}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {action.label}
        </button>
      )}
    </article>
  );
}

// QR code e partilha do link da entrega para o telemóvel do estafeta.
function CourierDialog({ order, onClose }: { order: KitchenOrderView; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}${order.courierPath}`;

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((QR) => QR.toDataURL(url, { width: 280, margin: 1 }))
      .then((data) => !cancelled && setQr(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard bloqueado */
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Link do estafeta para ${order.number}`} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-5 text-center text-ink" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold">Entrega {order.number}</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-ink/5" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-muted">O estafeta lê o código com a câmara do telemóvel e toca em &quot;Partilhar localização&quot;.</p>
        <div className="mx-auto mt-4 flex h-[280px] w-[280px] items-center justify-center rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="QR code do link do estafeta" width={280} height={280} /> : <Loader2 className="h-6 w-6 animate-spin text-muted" />}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Entrega ${order.number}: ${url}`)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">WhatsApp</a>
          <button onClick={copy} className="btn-secondary btn-sm">{copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar link</>}</button>
        </div>
      </div>
    </div>
  );
}
