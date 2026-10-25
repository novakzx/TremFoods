import { Check } from 'lucide-react';
import { LIFECYCLE, FLOW } from '@/domains/orders/lifecycle';

const TIME = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });

/**
 * Linha do tempo do pedido (entrega ou levantamento): vertical no telemóvel,
 * horizontal a partir de `sm`. Cada passo mostra a hora em que aconteceu.
 */
export function StatusTimeline({
  status,
  deliveryMethod,
  events,
}: {
  status: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  events?: { status: string; at: string | Date }[];
}) {
  if (status === 'CANCELLED') {
    return (
      <p className="alert-error">
        Este pedido foi cancelado. Se já tinha pago online, o reembolso é feito em 3–5 dias úteis.
      </p>
    );
  }

  const current = LIFECYCLE[status]?.order ?? 0;
  const at = new Map((events ?? []).map((e) => [e.status, new Date(e.at)]));

  return (
    <ol className="grid gap-4 sm:grid-cols-4 sm:gap-2">
      {FLOW.map((step, i) => {
        const done = i <= current;
        const meta = LIFECYCLE[step];
        const label = deliveryMethod === 'PICKUP' && meta.pickupLabel ? meta.pickupLabel : meta.label;
        const time = at.get(step);
        return (
          <li key={step} className="relative flex items-start gap-3 sm:flex-col sm:gap-2">
            {/* traço até ao passo seguinte */}
            {i < FLOW.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[13px] top-7 h-[calc(100%-12px)] w-0.5 sm:left-7 sm:top-[13px] sm:h-0.5 sm:w-[calc(100%-20px)] ${i < current ? 'bg-brand' : 'bg-line'}`}
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-xs font-bold ${
                done ? 'border-brand bg-brand text-ink' : 'border-line bg-surface text-muted'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className="pt-1 sm:pt-0">
              <span className={`block text-[13px] font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{label}</span>
              <span className="block text-xs text-muted">
                {time ? TIME.format(time) : i === current + 1 ? 'a seguir' : ''}
                {done && i === current && !time ? 'agora' : ''}
              </span>
            </span>
            <span className="sr-only">{done ? '(concluído)' : '(pendente)'}</span>
          </li>
        );
      })}
    </ol>
  );
}
