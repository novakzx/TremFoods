'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, Phone, MapPin, Loader2, CheckCircle2, Radio, StickyNote, Banknote } from 'lucide-react';
import { apiPost } from '@/infra/http-client';

type CourierOrder = {
  number: string;
  customerName: string;
  customerPhone: string;
  address: string;
  mapsUrl: string;
  note: string | null;
  items: { qty: number; name: string }[];
  payment: string;
  toCollect: boolean;
};

const SEND_EVERY_MS = 10_000;

type Sharing = 'off' | 'starting' | 'on' | 'denied' | 'unsupported';

export function CourierClient({ token, order }: { token: string; order: CourierOrder }) {
  const [sharing, setSharing] = useState<Sharing>('off');
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastPost = useRef(0);
  const pending = useRef<GeolocationPosition | null>(null);

  const send = async (pos: GeolocationPosition) => {
    lastPost.current = Date.now();
    try {
      const r = await apiPost(`/api/courier/${token}/location`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
      });
      if (r.ok) {
        setLastSent(new Date());
        setProblem(null);
      } else if (r.status === 410) {
        stop();
        setDone(true);
      } else {
        setProblem(r.data.error?.message ?? 'Falha ao enviar a posição.');
      }
    } catch {
      setProblem('Sem rede — a posição será enviada quando voltar.');
    }
  };

  const stop = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing('off');
  };

  const start = () => {
    if (!('geolocation' in navigator)) {
      setSharing('unsupported');
      return;
    }
    setSharing('starting');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setSharing('on');
        pending.current = pos;
        if (Date.now() - lastPost.current >= SEND_EVERY_MS) void send(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          stop();
          setSharing('denied');
        } else {
          setProblem('Sem sinal de GPS — a tentar de novo.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
  };

  // Mesmo parado (sem eventos do GPS) reenvia a última posição de 10 em 10 s.
  useEffect(() => {
    if (sharing !== 'on') return;
    const t = setInterval(() => {
      if (pending.current && Date.now() - lastPost.current >= SEND_EVERY_MS) void send(pending.current);
    }, SEND_EVERY_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing]);

  // Ecrã sempre ligado durante a entrega (o GPS para com o ecrã apagado).
  useEffect(() => {
    if (sharing !== 'on' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    const request = async () => {
      if (document.visibilityState === 'visible') sentinel = await navigator.wakeLock.request('screen').catch(() => null);
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release().catch(() => {});
    };
  }, [sharing]);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const delivered = async () => {
    if (busy || !window.confirm(`Confirmar a entrega do pedido ${order.number}?`)) return;
    setBusy(true);
    try {
      const r = await apiPost(`/api/courier/${token}/delivered`);
      if (r.ok || r.status === 410) {
        stop();
        setDone(true);
      } else setProblem(r.data.error?.message ?? 'Não foi possível concluir.');
    } catch {
      setProblem('Sem rede — tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="container-app max-w-md py-12">
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-3 font-display text-xl font-bold">Entrega {order.number} concluída</p>
          <p className="mt-1 text-sm text-muted">A partilha de localização terminou. Bom trabalho!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app max-w-md space-y-3 py-5">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-extrabold">Entrega {order.number}</h1>
        <span className="text-sm text-muted">{order.items.reduce((s, i) => s + i.qty, 0)} artigos</span>
      </div>

      {/* Partilha de localização */}
      <section className={`card p-4 ${sharing === 'on' ? 'border-success' : ''}`}>
        {sharing === 'on' ? (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-success">
              <Radio className="h-5 w-5" /> A partilhar localização
            </p>
            <button onClick={stop} className="btn-ghost btn-sm">Pausar</button>
          </div>
        ) : (
          <button onClick={start} disabled={sharing === 'starting'} className="btn-primary w-full text-base">
            {sharing === 'starting' ? <><Loader2 className="h-4 w-4 animate-spin" /> À espera do GPS…</> : <><Radio className="h-5 w-5" /> Partilhar localização com o cliente</>}
          </button>
        )}
        <p className="mt-2 text-xs text-muted">
          {sharing === 'on'
            ? `Mantenha esta página aberta. ${lastSent ? `Última posição enviada às ${lastSent.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.` : ''}`
            : sharing === 'denied'
              ? 'A localização foi bloqueada. Ative-a nas definições do navegador para este site e tente de novo.'
              : sharing === 'unsupported'
                ? 'Este navegador não permite partilhar a localização.'
                : 'O cliente vê no mapa onde está, em tempo real, até confirmar a entrega.'}
        </p>
        {problem && <p role="alert" className="alert-error mt-2">{problem}</p>}
      </section>

      {/* Destino */}
      <section className="card space-y-3 p-4">
        <p className="flex items-start gap-2 text-[15px] font-semibold">
          <MapPin className="mt-0.5 h-5 w-5 flex-none text-brand-deep" /> {order.address}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a href={order.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <Navigation className="h-4 w-4" /> Navegar
          </a>
          <a href={`tel:${order.customerPhone}`} className="btn-secondary">
            <Phone className="h-4 w-4" /> {order.customerName.split(' ')[0]}
          </a>
        </div>
        {order.note && (
          <p className="flex items-start gap-1.5 rounded-lg bg-accent/25 px-3 py-2 text-sm font-medium">
            <StickyNote className="mt-0.5 h-4 w-4 flex-none" /> {order.note}
          </p>
        )}
      </section>

      <section className="card p-4">
        <p className={`flex items-center gap-2 font-semibold ${order.toCollect ? 'text-danger' : 'text-success'}`}>
          <Banknote className="h-5 w-5" /> {order.payment}
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-muted">
          {order.items.map((i, idx) => (
            <li key={idx}><span className="font-semibold text-ink">{i.qty}×</span> {i.name}</li>
          ))}
        </ul>
      </section>

      <button onClick={delivered} disabled={busy} className="btn w-full bg-success text-base text-white hover:bg-success/90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Entregue
      </button>
    </div>
  );
}
