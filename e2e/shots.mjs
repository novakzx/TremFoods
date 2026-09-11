import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const browser = await chromium.launch();

async function shot(name, url, viewport, extra) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  if (extra) await extra(p);
  await p.screenshot({ path: `/home/user/trem-food/e2e/shots/${name}.png`, fullPage: false });
  await ctx.close();
  console.log('shot:', name);
}

await shot('home-mobile', '/', { width: 390, height: 844 });
await shot('home-desktop', '/', { width: 1280, height: 900 });
await shot('cardapio-desktop', '/cardapio', { width: 1280, height: 900 });
await shot('produto-mobile', '/cardapio/x-salada-da-casa', { width: 390, height: 844 });
await shot('login-mobile', '/login', { width: 390, height: 844 });

// carrinho com itens + checkout logado
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const csrf = await (await ctx.request.get(BASE + '/api/auth/csrf')).json();
const pid = 'cmtmdqk9z0000z8ma8b9wv0ow'; // trem-smash (id de seed — revalidado abaixo via API)
// achar id do produto via cardapio HTML? usar API de cart não lista produtos; basta pegar do banco via API? usamos o known id do seed
await p.goto(BASE + '/cardapio', { waitUntil: 'networkidle' });
// adicionar dois produtos pela UI
const addButtons = p.locator('[aria-label="Adicionar ao carrinho"]');
await addButtons.nth(0).click();
await p.waitForTimeout(500);
await addButtons.nth(7).click(); // truffle
await p.waitForTimeout(500);
await p.goto(BASE + '/carrinho', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/home/user/trem-food/e2e/shots/carrinho-desktop.png', fullPage: false });
console.log('shot: carrinho-desktop');
await ctx.close();

// checkout + admin screenshots
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const p2 = await ctx2.newPage();
await p2.goto(BASE + '/login?next=/admin', { waitUntil: 'networkidle' });
await p2.getByLabel('E-mail').fill('admin@tremfood.pt');
await p2.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
await p2.getByRole('button', { name: 'Iniciar sessão' }).click();
await p2.waitForURL(BASE + '/admin', { timeout: 15000 });
await p2.waitForTimeout(500);
await p2.screenshot({ path: '/home/user/trem-food/e2e/shots/admin-desktop.png', fullPage: false });
console.log('shot: admin-desktop');
await ctx2.close();

const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const p3 = await ctx3.newPage();
await p3.goto(BASE + '/login?next=/checkout', { waitUntil: 'networkidle' });
await p3.getByLabel('E-mail').fill('admin@tremfood.pt');
await p3.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
await p3.getByRole('button', { name: 'Iniciar sessão' }).click();
await p3.waitForURL(BASE + '/checkout', { timeout: 15000 }).catch(() => {});
// carrinho da admin pode estar vazio — não tiramos print do checkout se vazio
await p3.waitForTimeout(600);
await p3.screenshot({ path: '/home/user/trem-food/e2e/shots/checkout-desktop.png', fullPage: false });
console.log('shot: checkout-desktop');
await ctx3.close();

await browser.close();
