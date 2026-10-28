// Horário avaliado sempre na hora de Lisboa, qualquer que seja o fuso da máquina.
import { withinOpeningHours } from '../src/domains/shop/hours';

let fails = 0;
const cases: [string, string, boolean][] = [
  ['03:00 (verão)', '2026-09-08T02:00:00Z', false],
  ['06:29 (verão)', '2026-09-08T05:29:00Z', false],
  ['06:30 (verão)', '2026-09-08T05:30:00Z', true],
  ['23:59 (verão)', '2026-09-08T22:59:00Z', true],
  ['00:01 (verão)', '2026-09-08T23:01:00Z', false],
  ['06:29 (inverno)', '2026-12-08T06:29:00Z', false],
  ['06:30 (inverno)', '2026-12-08T06:30:00Z', true],
];
for (const [label, iso, expected] of cases) {
  const got = withinOpeningHours(new Date(iso));
  console.log(`${got === expected ? '✓' : '✗'} ${label} → ${got}`);
  if (got !== expected) fails++;
}
console.log(fails === 0 ? '\n✅ UNIT HOURS OK' : `\n❌ ${fails} falhas`);
process.exit(fails === 0 ? 0 : 1);
