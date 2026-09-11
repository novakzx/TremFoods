import { Check, Clock } from 'lucide-react';
import { LIFECYCLE, FLOW } from '@/domains/orders/order-status';


/**
 * Linha do tempo visual do pedido (entrega ou levantamento).
 * Sem animações — apenas estado presente/restante e a hora do evento.
 */
export function StatusTimeline({
  status,
  deliveryMethod,
  events,
  compact = false,
}: {
  status: string;
  deliveryMethod: 'DELIVERY' | 'PICKUP';
  events?: { status: string; at: string | Date }[];
  compact?: boolean;
}) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
        Este pedido foi cancelado. Se já efetuou o pagamento, será reembolsado em 3-5 dias úteis.
      </div>
    );
  }

  const current = LIFECYCLE[status]?.order ?? 0;
  const at = new Map((events ?? []).map((e) => [e.status, new Date(e.at)]));

  return (
    <ol className={compact ? 'flex items-center gap-0' : 'grid gap-0 sm:grid-cols-[repeat(4,1fr)]'}>
      {FLOW.map((step, i) => {
        const done = i <= current;
        const meta = LIFECYCLE[step];
        const label = deliveryMethod === 'PICKUP' && meta.pickupLabel ? meta.pickupLabel : meta.label;
        const time = at.get(step);
        return (
          <li key={step} className={compact ? 'flex-1' : 'relative flex gap-3 sm:block'}>
            {/* linha de ligação */}
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute left-[9px] top-[17px] h-full w-px bg-line sm:left-0 sm:top-[18px] sm:h-px sm:w-full ${
                  compact ? 'top-[11px]' : ''
                } ${i <= current ? 'bg-gradient-to-r from-brand to-accent' : ''}`}
                style={compact ? { left: 22, top: 11, width: 'calc(100% - 44px)' } : undefined}
              />
            )}
            <div className="relative flex items-center gap-3 py-1 sm:block sm:pr-4">
              <span
                className={`z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full border-2 transition-colors ${
                  done ? 'border-transparent bg-gradient-to-br from-brand to-accent text-ink shadow-sm' : 'border-line bg-surface text-muted'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clock className="h-4 w-4" />}
              </span>
              <div className="sm:mt-2">
                <p className={`text-[13px] font-semibold ${done ? 'text-ink' : 'text-muted'}`}>{label}</p>
                {!compact && (
                  <p className="mt-0.5 text-xs text-muted">
                    {time ? new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(time) : done && i === current ? 'em curso' : 'agendado'}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
