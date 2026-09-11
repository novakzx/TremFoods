// Regressão do CSRF: a rota /api/auth/csrf já não pode ser cacheada (token fixo
// partilhado) e o cliente renova token+cookie e repete UMA vez se o servidor
// devolver CSRF error neste cenário — cookie apagado entre a busca e o envio.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('tf-cookie-consent', 'all'));
const page = await ctx.newPage();
await page.goto(`${BASE}/login?next=/admin`, { waitUntil: 'domcontentloaded' });
await page.evaluate(async () => {
  await fetch('/api/auth/csrf', { cache: 'no-store' });
  document.cookie = 'trem_csrf=; Path=/; Max-Age=0';
});
await page.getByLabel('E-mail').fill('admin@tremfood.pt');
await page.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
await page.getByRole('button', { name: 'Iniciar sessão' }).click();
await page.waitForTimeout(2500);
const url = page.url();
const role = await page.evaluate(() => fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).then((d) => d.user?.role));
const pass = url.includes('/admin') && role === 'ADMIN';
console.log(pass ? '✅ CSRF retry OK — login recuperou o cookie e entrou no admin' : `❌ url=${url} role=${role}`);
await browser.close();
process.exit(pass ? 0 : 1);
