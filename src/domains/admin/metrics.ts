import { prisma } from '@/infra/db';

// Todas as fronteiras de período (dia, semana, mês) são calculadas no fuso da
// loja (Europe/Lisbon — alterna WET/WEST), nunca no fuso do servidor.

type WallParts = { year: number; month: number; day: number; hour: number; minute: number };

export function lisbonParts(utc: Date): WallParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(fmt.formatToParts(utc).find((p) => p.type === t)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

// Hora de parede de Lisboa → instante UTC. O Intl não oferece conversão inversa
// direta, por isso ajusta iterativamente (converge em 2 passos; cobre DST).
export function lisbonToUtc(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = lisbonParts(new Date(guess));
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const diff = target - wall;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}

export type MetricWindow = {
  key: 'today' | 'week' | 'month';
  label: string;
  prevLabel: string;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
};

export function metricWindows(now = new Date()): MetricWindow[] {
  const parts = lisbonParts(now);
  const dayStart = lisbonToUtc(parts.year, parts.month, parts.day);
  // Semana começa à segunda-feira (convenção portuguesa).
  const mondayOffset = (now.getDay() + 6) % 7;
  const weekStart = lisbonToUtc(parts.year, parts.month, parts.day - mondayOffset);
  const monthStart = lisbonToUtc(parts.year, parts.month, 1);

  return [
    {
      key: 'today',
      label: 'Hoje',
      prevLabel: 'ontem',
      from: dayStart,
      to: lisbonToUtc(parts.year, parts.month, parts.day + 1),
      prevFrom: lisbonToUtc(parts.year, parts.month, parts.day - 1),
      prevTo: dayStart,
    },
    {
      key: 'week',
      label: 'Esta semana',
      prevLabel: 'semana anterior',
      from: weekStart,
      to: lisbonToUtc(parts.year, parts.month, parts.day + 1),
      prevFrom: lisbonToUtc(parts.year, parts.month, parts.day - mondayOffset - 7),
      prevTo: weekStart,
    },
    {
      key: 'month',
      label: 'Este mês',
      prevLabel: 'mês anterior',
      from: monthStart,
      to: lisbonToUtc(parts.year, parts.month, parts.day + 1),
      prevFrom: lisbonToUtc(parts.year, parts.month - 1, 1),
      prevTo: monthStart,
    },
  ];
}

export type MetricSummary = {
  key: MetricWindow['key'];
  label: string;
  prevLabel: string;
  count: number;
  revenueCents: number;
  prevCount: number;
  prevRevenueCents: number;
};

type OrderLike = { createdAt: Date; status: string; totalCents: number };

// Receita = soma dos totais, excluindo cancelados (pendentes e pagos contam —
// a faturação é a do pedido, independentemente do estado do pagamento).
export function summarizeOrders(orders: OrderLike[], windows: MetricWindow[]): MetricSummary[] {
  return windows.map((w) => {
    const cur = orders.filter((o) => o.createdAt >= w.from && o.createdAt < w.to && o.status !== 'CANCELLED');
    const prev = orders.filter((o) => o.createdAt >= w.prevFrom && o.createdAt < w.prevTo && o.status !== 'CANCELLED');
    return {
      key: w.key,
      label: w.label,
      prevLabel: w.prevLabel,
      count: cur.length,
      revenueCents: cur.reduce((s, o) => s + o.totalCents, 0),
      prevCount: prev.length,
      prevRevenueCents: prev.reduce((s, o) => s + o.totalCents, 0),
    };
  });
}

export type DailyRevenue = { label: string; revenueCents: number; count: number; isToday: boolean };

// Série dos últimos N dias (inclui dias sem pedidos — barras a zero).
export function revenueSeries(orders: OrderLike[], days = 14, now = new Date()): DailyRevenue[] {
  const today = lisbonParts(now);
  const dayFmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', day: '2-digit', timeZone: 'Europe/Lisbon' });
  const out: DailyRevenue[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = lisbonToUtc(today.year, today.month, today.day - i);
    const end = lisbonToUtc(today.year, today.month, today.day - i + 1);
    const dayOrders = orders.filter((o) => o.createdAt >= start && o.createdAt < end && o.status !== 'CANCELLED');
    out.push({
      label: dayFmt.format(start).replace(/\./g, ''),
      revenueCents: dayOrders.reduce((s, o) => s + o.totalCents, 0),
      count: dayOrders.length,
      isToday: i === 0,
    });
  }
  return out;
}

export async function dashboardOrders(now = new Date()) {
  // Dados desde o início do mês anterior — suficiente para o comparativo mensal.
  const windows = metricWindows(now);
  const from = windows[2].prevFrom;
  return prisma.order.findMany({
    where: { createdAt: { gte: from } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { items: true, user: { select: { email: true } } },
  });
}
