import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 2600 }, deviceScaleFactor: 1.5 })).newPage();
await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/home/user/trem-food/e2e/shots/home-full.png', fullPage: true });
await b.close();
console.log('ok');
