// Sanitização para campos de texto livres: remove control chars e colapsa espaços.
export function cleanText(value: string, maxLen: number): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return cleaned.slice(0, maxLen);
}
