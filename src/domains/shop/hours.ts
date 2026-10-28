// Horário de funcionamento — todos os dias, 06h30–00h00 (cozinha encerra à meia-noite).
// Módulo puro: partilhado entre servidor (bloqueio de pedidos) e cliente (indicador).
export const OPENS_AT_MINUTES = 6 * 60 + 30; // 06:30
export const CLOSES_AT_MINUTES = 24 * 60; // 00:00 do dia seguinte

export const OPENING_HOURS_LABEL = '06h30–00h00';

const LISBON_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Lisbon',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Minutos desde a meia-noite na hora de Lisboa — nunca no fuso do servidor
// (a Vercel corre em UTC) nem no do browser (turistas, VPN).
export function lisbonMinutes(now = new Date()) {
  const parts = LISBON_CLOCK.formatToParts(now);
  const get = (t: 'hour' | 'minute') => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get('hour') % 24) * 60 + get('minute');
}

export function withinOpeningHours(now = new Date()) {
  const minutes = lisbonMinutes(now);
  return minutes >= OPENS_AT_MINUTES && minutes < CLOSES_AT_MINUTES;
}
