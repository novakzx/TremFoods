// Screenshots da gestão de menu (produto com adicionais, carrinho, editor admin).
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// 1) Página do produto com adicionais (mobile) — seleção feita, total com extras.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('tf-cookie-consent', 'all'));
await page.goto(`${BASE}/cardapio/double-smash-classico`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Médio', exact: true }).click();
await page.getByRole('button', { name: /Ovo/ }).click();
await page.getByRole('button', { name: /Bacon/ }).click();
await page.waitForFunction(() => document.querySelector('button.btn-primary')?.textContent.includes('12,70'));
await page.screenshot({ path: `${OUT}menu-produto-adicionais.png`, fullPage: true });

// 2) Carrinho com a linha de opções (mobile).
await page.getByRole('button', { name: /Adicionar ·/ }).click();
await page.waitForTimeout(600);
await page.goto(`${BASE}/carrinho`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.body.textContent.includes('no carrinho'));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}menu-carrinho-opcoes.png`, fullPage: true });

// 3) Editor do cardápio no admin (desktop) com o produto de adicionais aberto.
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const a = await admin.newPage();
await a.addInitScript(() => localStorage.setItem('tf-cookie-consent', 'all'));
await a.goto(`${BASE}/login?next=/admin/menu`, { waitUntil: 'domcontentloaded' });
await a.getByLabel('E-mail').fill('admin@tremfood.pt');
await a.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
await a.getByRole('button', { name: 'Iniciar sessão' }).click();
await a.waitForURL(`${BASE}/admin/menu`, { timeout: 15000 });
await a.waitForSelector('text=Produtos');
  await a.locator('button', { hasText: 'Double Smash Clássico' }).first().click();
  await a.waitForSelector('input[placeholder="Nome do grupo (ex.: Extras)"]');
await a.waitForTimeout(300);
await a.screenshot({ path: `${OUT}menu-admin-editor.png`, fullPage: true });

console.log('Screenshots em e2e/shots/');
await browser.close();
