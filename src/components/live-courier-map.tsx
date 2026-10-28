'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { Bike } from 'lucide-react';
import { STORE_LOCATION } from '@/domains/shop/location';
import type { CourierPosition } from '@/domains/delivery/courier';
import { apiGet } from '@/infra/http-client';

const POLL_MS = 10_000;
const STALE_MS = 2 * 60_000;

// Marcadores desenhados em HTML/CSS (sem ficheiros de imagem).
const pin = (bg: string, label: string) =>
  `<div style="width:36px;height:36px;border-radius:9999px;background:${bg};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1">${label}</div>`;

/**
 * Mapa com o estafeta em tempo real. Consulta `pollUrl` (que devolve
 * `{ courier }`) a cada 10 s e move o marcador.
 */
export function LiveCourierMap({ pollUrl, initial }: { pollUrl: string; initial: CourierPosition }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const courierMarker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const [position, setPosition] = useState<CourierPosition>(initial);
  const [now, setNow] = useState(() => Date.now());

  // Cria o mapa uma vez (o Leaflet só corre no browser).
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !box.current || map.current) return;
      leaflet.current = L;
      const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], {
        icon: L.divIcon({ html: pin('#231506', '🍔'), className: '', iconSize: [36, 36], iconAnchor: [18, 18] }),
        title: STORE_LOCATION.label,
        keyboard: false,
      }).addTo(m);
      map.current = m;
      setPosition((p) => (p ? { ...p } : p)); // desenha o estafeta inicial
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      courierMarker.current = null;
    };
  }, []);

  // Move (ou cria) o marcador do estafeta e enquadra loja + estafeta.
  useEffect(() => {
    const L = leaflet.current;
    const m = map.current;
    if (!L || !m || !position) return;
    const latLng: [number, number] = [position.lat, position.lng];
    if (!courierMarker.current) {
      courierMarker.current = L.marker(latLng, {
        icon: L.divIcon({ html: pin('#FF6A00', '🛵'), className: '', iconSize: [36, 36], iconAnchor: [18, 18] }),
        title: 'Estafeta',
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(m);
      m.fitBounds(L.latLngBounds([latLng, [STORE_LOCATION.lat, STORE_LOCATION.lng]]), { padding: [40, 40], maxZoom: 16 });
    } else {
      courierMarker.current.setLatLng(latLng);
      if (!m.getBounds().pad(-0.1).contains(latLng)) m.panTo(latLng);
    }
  }, [position]);

  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      const r = await apiGet<{ courier: CourierPosition }>(pollUrl).catch(() => null);
      if (r?.ok) setPosition(r.data.courier ?? null);
      setNow(Date.now());
    };
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [pollUrl]);

  const age = position ? Math.max(0, now - new Date(position.at).getTime()) : null;
  const status = !position
    ? 'O estafeta ainda não começou a partilhar a localização.'
    : age! > STALE_MS
      ? `Sem sinal do estafeta há ${Math.round(age! / 60_000)} min — última posição no mapa.`
      : 'Posição do estafeta em tempo real.';

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-line">
      <div ref={box} className="relative z-0 h-64 w-full bg-paper sm:h-80" role="img" aria-label="Mapa com a posição do estafeta e da loja" />
      <p className="flex items-center gap-2 bg-surface px-3.5 py-2.5 text-[13px] text-muted" aria-live="polite">
        <Bike className={`h-4 w-4 flex-none ${position && age! <= STALE_MS ? 'text-brand-deep' : ''}`} /> {status}
      </p>
    </div>
  );
}
