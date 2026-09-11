// Verifica as fronteiras de período no fuso da loja (Lisboa, DST ativo em setembro).
import { lisbonToUtc, lisbonParts, metricWindows } from '../src/domains/admin/metrics';

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ' — ' + extra}`);
  if (!cond) fails++;
};

// 2026-09-08 em Lisboa (WEST, UTC+1): 00:00 local = 2026-09-07T23:00Z
const midnight = lisbonToUtc(2026, 9, 8, 0, 0);
check('meia-noite de 08/09 Lisboa = 07/09 23:00Z', midnight.toISOString() === '2026-09-07T23:00:00.000Z', midnight.toISOString());

// Round-trip: 14:00 local de 08/09 = 08/09 13:00Z
const parts = lisbonParts(new Date('2026-09-08T13:00:00.000Z'));
check('14:00 Lisboa = 13:00Z', parts.hour === 14 && parts.day === 8, JSON.stringify(parts));

// Janelas de 08/09/2026 (terça)
const now = new Date('2026-09-08T12:00:00.000Z');
const [today, week, month] = metricWindows(now);
check('hoje começa 07/09 23:00Z', today.from.toISOString() === '2026-09-07T23:00:00.000Z', today.from.toISOString());
check('semana (segunda 07/09) começa 06/09 23:00Z', week.from.toISOString() === '2026-09-06T23:00:00.000Z', week.from.toISOString());
check('mês começa 31/08 23:00Z', month.from.toISOString() === '2026-08-31T23:00:00.000Z', month.from.toISOString());

// Comparativo: mês anterior começa a 30/06 23:00Z
check('mês anterior (agosto) começa 31/07 23:00Z', month.prevFrom.toISOString() === '2026-07-31T23:00:00.000Z', month.prevFrom.toISOString());

console.log(fails === 0 ? '\n✅ UNIT METRICS OK' : `\n❌ ${fails} falhas`);
process.exit(fails === 0 ? 0 : 1);
