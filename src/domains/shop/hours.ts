// Horário de funcionamento — todos os dias, 06h30–00h00 (cozinha encerra à meia-noite).
// Módulo puro: partilhado entre servidor (bloqueio de pedidos) e cliente (indicador).
export const OPENS_AT_MINUTES = 6 * 60 + 30; // 06:30
export const CLOSES_AT_MINUTES = 24 * 60; // 00:00 do dia seguinte

export const OPENING_HOURS_LABEL = '06h30–00h00';

export function withinOpeningHours(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= OPENS_AT_MINUTES && minutes < CLOSES_AT_MINUTES;
}
