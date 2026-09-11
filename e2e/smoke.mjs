// Smoke E2E — Trem Food (Next.js 14 App Router + PostgreSQL + Prisma)
// Uso: NODE_PATH=/tmp/pwtest/node_modules node e2e/smoke.mjs
// Cobre: home, cardápio, adicionais (grupos/opções), carrinho por combinação,
// registo, checkout, tracking, admin (pedidos + editor do cardápio) e segurança.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = `e2e-${Date.now()}@tremfood.pt`;
const PASS = 'TesteSeguro2026!';
const SMASH = 'Double Smash Clássico'; // produto com adicionais (seed de demonstração)

let failures = 0;
const step = (name) => console.log(`\n▶ ${name}`);
const ok = (name) => console.log(`  ✓ ${name}`);
const fail = (name, extra = '') => {
  failures++;
  console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12/13/14
const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// Os testes correm com consentimento de cookies já dado (banner não bloqueia cliques).
await ctx.addInitScript(() => localStorage.setItem('tf-cookie-consent', 'all'));
await adminCtx.addInitScript(() => localStorage.setItem('tf-cookie-consent', 'all'));
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

try {
  step('1. Página inicial (mobile)');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  (await page.title()).includes('Hamburgueria em Almada') ? ok('título hero') : fail('título hero', await page.title());
  (await page.locator('h1').first().textContent()).includes('picanha') ? ok('hero') : fail('hero');
  await page.getByRole('button', { name: 'Abrir menu' }).isVisible() ? ok('hambúrguer menu mobile') : fail('menu mobile');
  const menuItems = await page.locator('[aria-label="Adicionar ao carrinho"]').count();
  menuItems > 5 ? ok(`cards com add-to-cart na home (${menuItems})`) : fail('produtos na home', String(menuItems));

  step('2. Pesquisa, filtro e atalho de adicionais no cardápio');
  await page.goto(`${BASE}/cardapio`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Pesquisar no cardápio…').fill('truffle');
  await page.waitForTimeout(150);
  (await page.locator('article').count()) === 1 ? ok('pesquisa devolve 1 resultado') : fail('pesquisa', String(await page.locator('article').count()));
  await page.getByPlaceholder('Pesquisar no cardápio…').fill('');
  await page.getByRole('button', { name: 'Categorias' }).click(); // chips ocultos no mobile
  await page.getByRole('button', { name: 'Bebidas' }).click();
  await page.waitForTimeout(150);
  (await page.locator('article').count()) === 2 ? ok('filtro Bebidas → 2 artigos') : fail('filtro bebidas', String(await page.locator('article').count()));
  await page.getByRole('button', { name: 'Bebidas', exact: true }).click(); // o toggle mostra o filtro ativo
  await page.getByRole('button', { name: 'Todos' }).click();
  await page.waitForTimeout(150);
  (await page.locator('[aria-label="Ver opções"]').count()) >= 1 ? ok('produto com adicionais mostra "Ver opções"') : fail('atalho "Ver opções"');

  step('3. Detalhe de produto sem adicionais + adicionar ao carrinho');
  await page.goto(`${BASE}/cardapio/x-salada-da-casa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await page.waitForTimeout(400);
  const badge = await page.locator('header a[aria-label="Carrinho"] span').first().textContent().catch(() => '');
  badge === '1' ? ok('badge do carrinho = 1') : fail('badge carrinho', badge);

  step('4. Página do produto com adicionais (grupos, obrigatório, preço)');
  await page.goto(`${BASE}/cardapio/double-smash-classico`, { waitUntil: 'domcontentloaded' });
  (await page.getByText('Ponto da carne').count()) > 0 ? ok('grupo obrigatório visível') : fail('grupo obrigatório');
  (await page.getByText('Extras').count()) > 0 ? ok('grupo opcional visível') : fail('grupo opcional');
  const addBtn = page.getByRole('button', { name: /Adicionar ·/ });
  await addBtn.isDisabled() ? ok('botão bloqueado sem escolha obrigatória') : fail('botão devia estar desativado');
  await page.getByRole('button', { name: 'Médio', exact: true }).click();
  (await addBtn.isDisabled()) ? fail('botão continua bloqueado após escolher') : ok('botão desbloqueia após escolher');
  await page.getByRole('button', { name: /Ovo/ }).click();
  await page.getByRole('button', { name: /Bacon/ }).click();
  try {
    await page.waitForFunction(() => document.querySelector('button.btn-primary')?.textContent.includes('12,70'));
    ok('total inclui extras (10,90 + 0,80 + 1,00 = 12,70)');
  } catch {
    fail('total com extras', await addBtn.textContent());
  }
  await addBtn.click();
  await page.waitForTimeout(400);
  const badge2 = await page.locator('header a[aria-label="Carrinho"] span').first().textContent().catch(() => '');
  badge2 === '2' ? ok('badge do carrinho = 2') : fail('badge carrinho', badge2);

  step('5. Carrinho: opções, fusão por combinação e remoção');
  // O eur() do servidor usa espaço não separável (U+00A0) antes do €.
  const txt = (s) => s.replace(/\u00a0/g, ' ');
  const waitCart = () => page.waitForFunction(() => document.body.textContent.includes('no carrinho'));
  await page.goto(`${BASE}/carrinho`, { waitUntil: 'domcontentloaded' });
  await waitCart();
  const smashLine = () => page.locator('li', { hasText: SMASH });
  await smashLine().first().waitFor();
  const lineTxt = txt(await smashLine().textContent());
  lineTxt.includes('Médio') && lineTxt.includes('Ovo (+0,80 €)') && lineTxt.includes('Bacon (+1,00 €)')
    ? ok('linha mostra as opções escolhidas') : fail('opções na linha', lineTxt.slice(0, 120));
  lineTxt.includes('12,70 €') ? ok('preço unitário com extras (12,70)') : fail('preço unitário', lineTxt.slice(0, 120));
  let total = txt(await page.locator('aside dd.font-display').last().textContent());
  total.includes('25,60') ? ok(`subtotal 12,90 + 12,70 (${total})`) : fail('subtotal', total);
  await page.getByRole('button', { name: 'Aumentar' }).first().click(); // 2× X-Salada
  await page.waitForTimeout(400);
  total = txt(await page.locator('aside dd.font-display').last().textContent());
  total.includes('38,50') ? ok(`total após aumentar x-salada (${total})`) : fail('total', total);

  // Mesma combinação → a linha funde (qty 2); combinação diferente → linha própria.
  await page.goto(`${BASE}/cardapio/double-smash-classico`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Médio', exact: true }).click();
  await page.getByRole('button', { name: /Ovo/ }).click();
  await page.getByRole('button', { name: /Bacon/ }).click();
  await page.getByRole('button', { name: /Adicionar ·/ }).click();
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/cardapio/double-smash-classico`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Médio', exact: true }).click();
  await page.getByRole('button', { name: /Adicionar ·/ }).click();
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/carrinho`, { waitUntil: 'domcontentloaded' });
  await waitCart();
  await page.locator('li', { hasText: SMASH }).nth(1).waitFor();
  (await smashLine().getByText('2', { exact: true }).count()) === 1 ? ok('mesma combinação funde a linha (qty 2)') : fail('fusão de linhas');
  (await page.locator('li', { hasText: SMASH }).count()) === 2 ? ok('combinação diferente cria linha separada') : fail('linhas separadas', String(await page.locator('li', { hasText: SMASH }).count()));
  total = txt(await page.locator('aside dd.font-display').last().textContent());
  total.includes('62,10') ? ok(`total 25,80 + 25,40 + 10,90 (${total})`) : fail('total com 3 linhas', total);

  const removeSmash = page.getByRole('button', { name: `Remover ${SMASH}` });
  (await removeSmash.count()) === 2 ? ok('remover por linha') : fail('botões remover', String(await removeSmash.count()));
  await removeSmash.nth(1).click();
  await page.waitForTimeout(400);
  await removeSmash.nth(0).click();
  await page.waitForTimeout(400);
  total = txt(await page.locator('aside dd.font-display').last().textContent());
  total.includes('25,80') ? ok(`restam 2× x-salada (${total})`) : fail('total após remover adicionais', total);
  await page.getByRole('button', { name: 'Remover X-Salada da Casa' }).first().click();
  await page.waitForTimeout(400);
  (await page.locator('h1').first().textContent()).includes('vazio') ? ok('carrinho vazio após remover') : fail('remover item');

  step('6. Registo + verificação de e-mail (dev link)');
  await page.goto(`${BASE}/registar`, { waitUntil: 'domcontentloaded' });
  (await page.locator('form').count()) > 0 ? ok('formulário de registo renderiza') : fail('formulário de registo');
  const csrf = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  const reg = await ctx.request.post(`${BASE}/api/auth/register`, {
    headers: { 'x-csrf-token': csrf.csrfToken },
    data: { name: 'E2E Teste', email: EMAIL, password: PASS },
  });
  const regJson = await reg.json();
  if (!regJson.devVerifyLink) {
    fail('devVerifyLink não devolvido (isProd?)', JSON.stringify(regJson).slice(0, 200));
  } else {
    await page.goto(regJson.devVerifyLink, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    (await page.locator('body').textContent()).includes('E-mail confirmado')
      ? ok('verificação de e-mail concluída')
      : fail('página de verificação', (await page.locator('body').textContent()).slice(0, 120));
  }

  step('7. Fluxo de pedido completo (entrega, dinheiro)');
  await page.goto(`${BASE}/login?next=/checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Palavra-passe').fill(PASS);
  await page.getByRole('button', { name: 'Iniciar sessão' }).click();
  await page.waitForURL(`${BASE}/checkout`, { timeout: 15000 });
  ok('login redireciona para /checkout');
  await page.goto(`${BASE}/cardapio/x-salada-da-casa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Adicionar ao carrinho/ }).click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Nome completo').fill('E2E Teste');
  await page.getByLabel('Telemóvel').fill('912345678');
  await page.getByLabel('Rua').fill('Rua da Estação');
  await page.getByLabel('Número').fill('12');
  await page.getByLabel('Código postal').fill('2800-123');
  await page.getByRole('button', { name: 'Dinheiro' }).click();
  await page.getByRole('button', { name: /Confirmar pedido/ }).click();
  await page.waitForSelector('text=Pedido TF-', { timeout: 20000 });
  const success = await page.locator('body').textContent();
  const orderNumber = (success.match(/TF-\d{6}/) ?? [''])[0];
  orderNumber ? ok(`pedido criado: ${orderNumber}`) : fail('número de pedido');
  await page.getByRole('main').getByRole('link', { name: 'Acompanhar pedido' }).click();
  await page.waitForURL(`**/pedido/${orderNumber}`, { timeout: 15000 });
  (await page.locator('body').textContent()).includes('Estado do pedido')
    ? ok('página do pedido com timeline')
    : fail('página do pedido');
  await page.getByRole('button', { name: 'Ativar notificações' }).isVisible()
    ? ok('toggle de notificações push visível')
    : fail('toggle push');

  step('8. Acompanhamento público');
  await page.goto(`${BASE}/rastreamento`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Número do pedido').fill(orderNumber);
  await page.getByLabel('Últimos 4 dígitos').fill('5678');
  await page.getByRole('button', { name: 'Acompanhar' }).click();
  await page.waitForSelector('text=Pedido recebido', { timeout: 15000 });
  ok('tracking público mostra "Pedido recebido"');

  step('9. Admin: login, métricas e gestão do pedido');
  const admin = await adminCtx.newPage();
  await admin.goto(`${BASE}/login?next=/admin`, { waitUntil: 'domcontentloaded' });
  await admin.getByLabel('E-mail').fill('admin@tremfood.pt');
  await admin.getByLabel('Palavra-passe').fill('TrocarAdmin2026');
  await admin.getByRole('button', { name: 'Iniciar sessão' }).click();
  await admin.waitForURL(`${BASE}/admin`, { timeout: 15000 });
  ok('admin entra no painel');
  await admin.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
  (await admin.locator('body').textContent()).includes('Receita — últimos 14 dias') ? ok('dashboard de métricas carrega') : fail('dashboard métricas');
  (await admin.locator('body').textContent()).includes(orderNumber) ? ok(`dashboard mostra ${orderNumber}`) : fail('dashboard pedido visível');
  await admin.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
  const card = admin.locator('article', { hasText: orderNumber });
  await card.isVisible() ? ok('pedido aparece no painel') : fail('pedido no painel');
  await card.getByRole('button', { name: 'Iniciar preparação' }).click();
  await admin.waitForTimeout(600);
  (await card.locator('header').textContent()).includes('Em preparação')
    ? ok('estado atualizado para "Em preparação"')
    : fail('atualização de estado');
  await page.getByRole('button', { name: 'Acompanhar' }).click();
  await page.waitForSelector('text=Em preparação', { timeout: 20000 });
  ok('tracking reflete novo estado');

  step('10. Admin: editor do cardápio (produto, foto, descrição, adicionais)');
  await admin.goto(`${BASE}/admin/menu`, { waitUntil: 'domcontentloaded' });
  (await admin.getByText('Categorias (menus)').count()) > 0 && (await admin.getByText('Produtos').count()) > 0
    ? ok('painel do cardápio abre com listas') : fail('painel do cardápio');
  await admin.getByRole('button', { name: 'Novo produto' }).click();
  await admin.getByLabel('Nome').fill('E2E Smash Teste');
  await admin.getByLabel('Preço (cêntimos)').fill('1290');
  await admin.getByLabel('Categoria').selectOption({ label: 'Hambúrgueres' });
  await admin.getByLabel('Foto (URL)').fill('/img/items/double-smash.jpg');
  await admin.getByLabel('Ordem').fill('99');
  await admin.getByLabel('Descrição').fill('Hambúrguer criado pelo teste de ponta a ponta.');
  await admin.getByRole('button', { name: 'Guardar produto' }).click();
  try {
    await admin.waitForSelector('text=Produto criado.', { timeout: 15000 });
    ok('produto criado via admin');
  } catch {
    fail('criar produto', (await admin.locator('body').textContent()).slice(0, 200));
  }

  // Grupo obrigatório (Ponto da carne) — o editor mantém o produto aberto.
  // exact:true evita colidir com os botões "Remover grupo"/"Remover opção".
  await admin.getByRole('button', { name: 'Grupo', exact: true }).click();
  await admin.locator('input[placeholder="Nome do grupo (ex.: Extras)"]').first().fill('Ponto da carne');
  await admin.locator('input[placeholder="Opção (ex.: Ovo frito)"]').first().fill('Médio');
  await admin.getByRole('button', { name: 'Opção', exact: true }).click();
  await admin.locator('input[placeholder="Opção (ex.: Ovo frito)"]').nth(1).fill('Bem passado');
  await admin.getByRole('button', { name: 'Guardar adicionais' }).click();
  try {
    await admin.waitForSelector('text=Adicionais guardados.', { timeout: 15000 });
    ok('grupo obrigatório guardado');
  } catch {
    fail('guardar grupo', (await admin.locator('body').textContent()).slice(0, 200));
  }

  // Grupo opcional múltiplo com preços (Extras).
  await admin.getByRole('button', { name: 'Grupo', exact: true }).click();
  await admin.locator('input[placeholder="Nome do grupo (ex.: Extras)"]').nth(1).fill('Extras');
  await admin.getByRole('checkbox', { name: 'Obrigatório' }).nth(1).uncheck();
  await admin.getByRole('checkbox', { name: 'Múltipla' }).nth(1).check();
  await admin.locator('input[placeholder="Máx."]').fill('2');
  await admin.locator('input[placeholder="Opção (ex.: Ovo frito)"]').nth(2).fill('Ovo');
  await admin.locator('input[placeholder="€ cênt."]').nth(2).fill('80');
  await admin.getByRole('button', { name: 'Opção', exact: true }).nth(1).click();
  await admin.locator('input[placeholder="Opção (ex.: Ovo frito)"]').nth(3).fill('Bacon');
  await admin.locator('input[placeholder="€ cênt."]').nth(3).fill('100');
  await admin.getByRole('button', { name: 'Guardar adicionais' }).click();
  try {
    await admin.waitForSelector('text=Adicionais guardados.', { timeout: 15000 });
    ok('grupo de extras guardado');
  } catch {
    fail('guardar extras', (await admin.locator('body').textContent()).slice(0, 200));
  }
  try {
    await admin.waitForSelector('text=com adicionais', { timeout: 15000 });
    ok('lista marca produto com adicionais');
  } catch {
    fail('marca "com adicionais"');
  }

  // Cliente vê os adicionais no produto novo e compra com opção.
  const prodList = await (await admin.request.get(`${BASE}/api/admin/products`)).json();
  const e2eProd = prodList.products.find((p) => p.name === 'E2E Smash Teste');
  e2eProd?.hasOptions ? ok('API lista o produto criado com adicionais') : fail('API produto criado');
  await page.goto(`${BASE}/cardapio/${e2eProd.slug}`, { waitUntil: 'domcontentloaded' });
  (await page.getByText('Ponto da carne').count()) > 0 && (await page.getByText('Extras').count()) > 0
    ? ok('página pública mostra grupos criados no admin') : fail('grupos na página pública');
  await page.getByRole('button', { name: 'Médio', exact: true }).click();
  await page.getByRole('button', { name: /Ovo/ }).click();
  const e2eAdd = page.getByRole('button', { name: /Adicionar ·/ });
  try {
    await page.waitForFunction(() => document.querySelector('button.btn-primary')?.textContent.includes('13,70'));
    ok('total 12,90 + 0,80 = 13,70');
  } catch {
    fail('total e2e', await e2eAdd.textContent());
  }
  await e2eAdd.click();
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/carrinho`, { waitUntil: 'domcontentloaded' });
  await waitCart();
  const e2eLine = page.locator('li', { hasText: 'E2E Smash Teste' });
  await e2eLine.waitFor();
  const e2eTxt = txt(await e2eLine.textContent());
  e2eTxt.includes('Ovo (+0,80 €)') && e2eTxt.includes('13,70 €')
    ? ok('carrinho mostra opção e preço do produto criado')
    : fail('linha e2e', e2eTxt.slice(0, 120));
  await page.getByRole('button', { name: 'Remover E2E Smash Teste' }).click();
  await page.waitForTimeout(400);

  // Servidor recusa seleções inválidas (opção inexistente, de outro produto e obrigatório em falta).
  const dsProd = prodList.products.find((p) => p.name === SMASH);
  const dsOpts = await (await admin.request.get(`${BASE}/api/admin/products/${dsProd.id}/options`)).json();
  const foreignId = dsOpts.groups[0].options[0].id;
  const e2eOpts = await (await admin.request.get(`${BASE}/api/admin/products/${e2eProd.id}/options`)).json();
  const medId = e2eOpts.groups[0].options[0].id;
  const ovoId = e2eOpts.groups[1].options[0].id;
  const csrfA = await (await admin.request.get(`${BASE}/api/auth/csrf`)).json();
  const postCart = (options) => admin.request.post(`${BASE}/api/cart`, {
    headers: { 'x-csrf-token': csrfA.csrfToken },
    data: { productId: e2eProd.id, qty: 1, options },
  });
  let r = await postCart([{ itemId: 'cmopcaoinexistente0000' }]); // formato cuid válido, não existe na BD
  r.status() === 400 && (await r.json()).error?.code === 'INVALID_OPTION' ? ok('opção inexistente → 400 INVALID_OPTION') : fail('validar opção inexistente', String(r.status()));
  r = await postCart([{ itemId: foreignId }]);
  r.status() === 400 && (await r.json()).error?.code === 'INVALID_OPTION' ? ok('opção de outro produto → 400 INVALID_OPTION') : fail('validar opção estranha', String(r.status()));
  r = await postCart([]);
  r.status() === 400 && (await r.json()).error?.code === 'INVALID_OPTION' ? ok('obrigatório em falta → 400 INVALID_OPTION') : fail('validar obrigatório', String(r.status()));
  r = await postCart([{ itemId: medId }, { itemId: ovoId }]);
  if (r.status() === 200) {
    const cartJson = await (await admin.request.get(`${BASE}/api/cart`)).json();
    cartJson.items.some((i) => i.product.id === e2eProd.id && i.unitPriceCents === 1370)
      ? ok('seleção válida aceite com preço calculado no servidor (13,70)')
      : fail('preço calculado no servidor', JSON.stringify(cartJson.items).slice(0, 200));
  } else {
    fail('seleção válida recusada', String(r.status()));
  }

  // Remover = desativar: o produto some do site mas o histórico mantém-se.
  admin.once('dialog', (d) => d.accept());
  await admin.locator('button', { hasText: 'Desativar' }).click();
  try {
    await admin.waitForSelector('button[aria-label="E2E Smash Teste: esgotado"]', { timeout: 15000 });
    ok('produto desativado (esgotado na lista)');
  } catch {
    fail('desativar produto');
  }

  step('11. Páginas legais + PWA');
  for (const p of ['/privacidade', '/termos', '/cookies', '/offline']) {
    const rr = await page.request.get(`${BASE}${p}`);
    rr.status() === 200 ? ok(`${p} → 200`) : fail(`${p} → ${rr.status()}`);
  }
  const manifest = await (await page.request.get(`${BASE}/manifest.json`)).json();
  manifest.icons?.length === 3 && manifest.start_url === '/' ? ok('manifest.json com 3 ícones') : fail('manifest');
  const icons = await Promise.all(manifest.icons.map((i) => page.request.get(`${BASE}${i.src}`)));
  icons.every((rr) => rr.status() === 200) ? ok('todos os ícones PWA acessíveis') : fail('ícones PWA');

  step('12. Segurança: headers');
  const h = await (await page.request.get(BASE)).headers();
  h['x-frame-options'] === 'DENY' ? ok('X-Frame-Options DENY') : fail('X-Frame-Options', h['x-frame-options']);
  h['content-security-policy']?.includes("default-src 'self'") ? ok('CSP presente') : fail('CSP');
  const noXss = await (await page.request.get(`${BASE}/cardapio`)).text();
  noXss.includes('<script>alert') ? fail('XSS no HTML') : ok('sem marcação XSS literal');
} catch (e) {
  fail('exceção no fluxo', e.message?.slice(0, 300));
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? '✅ TODOS OS TESTES PASSARAM' : `❌ ${failures} FALHAS`}`);
process.exit(failures === 0 ? 0 : 1);
