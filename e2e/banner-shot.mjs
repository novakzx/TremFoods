// Screenshot com o banner de cookies visível (contexto sem consentimento).
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Aceitar todos' }).waitFor({ timeout: 10000 });
await page.screenshot({ path: 'e2e/shots/home-cookie-banner.png' });
console.log('shot ok');
await browser.close();
