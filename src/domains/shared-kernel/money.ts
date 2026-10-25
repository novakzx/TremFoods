export function eur(cents: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

// Datas sempre na hora de Lisboa (o servidor corre em UTC).
const DATE_TIME = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Lisbon' });

export function dateTimePT(d: Date) {
  return DATE_TIME.format(d);
}
