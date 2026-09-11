import { withinOpeningHours } from '../src/domains/shop/hours';
const at = (h: number, m: number) => new Date(2026, 8, 8, h, m);
for (const [label, d] of [['03:00', at(3, 0)], ['06:29', at(6, 29)], ['06:30', at(6, 30)], ['13:00', at(13, 0)], ['23:59', at(23, 59)]] as const) {
  console.log(label, '→', withinOpeningHours(d));
}
