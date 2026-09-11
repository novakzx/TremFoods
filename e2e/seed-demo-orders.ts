// Pedidos de demonstração para testes/screenshots locais (BD local apenas).
import { prisma } from '../src/infra/db';

(async () => {
const products = await prisma.product.findMany({ select: { id: true, name: true, priceCents: true } });

// Utilizadores de demonstração (a relação Order.userId é obrigatória).
const demoUsers = await Promise.all(
  ['demo1@tremfood.pt', 'demo2@tremfood.pt', 'demo3@tremfood.pt'].map(async (email) => {
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: 'Cliente Demo', email, passwordHash: 'demo' },
    });
    return u.id;
  }),
);
const demoUserId = (i: number) => demoUsers[i % demoUsers.length];
const [xSalada, xFrango, bacon, picanha, kibe, torresmo] = [
  products.find((p: { name: string }) => p.name.includes('X-Salada')),
  products.find((p: { name: string }) => p.name.includes('X-Frango')),
  products.find((p: { name: string }) => p.name.includes('Bacon')),
  products.find((p: { name: string }) => p.name.includes('Picanha')),
  products.find((p: { name: string }) => p.name.includes('Kibe')),
  products.find((p: { name: string }) => p.name.includes('Torresmo')),
];

const picked = (dayOffset: number, hour: number, min: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
};

const rows: { at: Date; name: string; phone: string; items: { product: typeof xSalada; qty: number }[]; method: string; status: string; delivery: 'DELIVERY' | 'PICKUP' }[] = [
  { at: picked(0, 12, 12), name: 'João Silva', phone: '912 345 678', items: [{ product: xSalada, qty: 2 }], method: 'CASH', status: 'RECEIVED', delivery: 'DELIVERY' },
  { at: picked(0, 11, 40), name: 'Ana Costa', phone: '934 111 222', items: [{ product: picanha, qty: 1 }, { product: kibe, qty: 1 }], method: 'MBWAY', status: 'PREPARING', delivery: 'PICKUP' },
  { at: picked(1, 19, 55), name: 'Miguel Rocha', phone: '966 333 444', items: [{ product: bacon, qty: 1 }, { product: torresmo, qty: 1 }], method: 'CARD', status: 'DELIVERED', delivery: 'DELIVERY' },
  { at: picked(2, 13, 20), name: 'Sofia Martins', phone: '925 555 666', items: [{ product: xFrango, qty: 2 }], method: 'CASH', status: 'DELIVERED', delivery: 'DELIVERY' },
  { at: picked(3, 12, 5), name: 'Rui Almeida', phone: '919 777 888', items: [{ product: xSalada, qty: 1 }, { product: kibe, qty: 2 }], method: 'MULTIBANCO', status: 'DELIVERED', delivery: 'PICKUP' },
  { at: picked(4, 20, 30), name: 'Carolina Nunes', phone: '961 999 000', items: [{ product: picanha, qty: 2 }], method: 'CARD', status: 'DELIVERED', delivery: 'DELIVERY' },
  { at: picked(5, 12, 45), name: 'Pedro Fonseca', phone: '913 121 314', items: [{ product: bacon, qty: 2 }], method: 'MBWAY', status: 'DELIVERED', delivery: 'DELIVERY' },
  { at: picked(6, 13, 15), name: 'Mariana Lopes', phone: '968 151 617', items: [{ product: xFrango, qty: 1 }, { product: torresmo, qty: 1 }], method: 'CASH', status: 'DELIVERED', delivery: 'PICKUP' },
  { at: picked(8, 19, 10), name: 'Diago Ferreira', phone: '927 181 920', items: [{ product: xSalada, qty: 3 }], method: 'CARD', status: 'CANCELLED', delivery: 'DELIVERY' },
  { at: picked(10, 12, 30), name: 'Beatriz Gonçalves', phone: '939 212 223', items: [{ product: kibe, qty: 3 }], method: 'CASH', status: 'DELIVERED', delivery: 'PICKUP' },
  { at: picked(12, 13, 5), name: 'Tomás Carvalho', phone: '914 242 526', items: [{ product: picanha, qty: 1 }, { product: xFrango, qty: 1 }], method: 'MBWAY', status: 'DELIVERED', delivery: 'DELIVERY' },
];

let n = 2;
for (const r of rows) {
  const subtotal = r.items.reduce((s, i) => s + i.product!.priceCents * i.qty, 0);
  const fee = r.delivery === 'PICKUP' ? 0 : subtotal >= 2500 ? 0 : 250;
  const total = subtotal + fee;
  await prisma.order.create({
    data: {
      number: `TF-${String(n).padStart(6, '0')}`,
      userId: demoUserId(n),
      status: r.status,
      paymentMethod: r.method,
      paymentStatus: r.status === 'CANCELLED' ? 'PENDING' : 'PAID',
      deliveryMethod: r.delivery,
      subtotalCents: subtotal,
      deliveryFeeCents: fee,
      totalCents: total,
      customerName: r.name,
      customerPhone: r.phone,
      customerEmail: `${r.name.split(' ')[0].toLowerCase()}@example.pt`,
      addressStreet: r.delivery === 'DELIVERY' ? 'Rua do Comércio' : null,
      addressNumber: r.delivery === 'DELIVERY' ? '12' : null,
      addressCity: r.delivery === 'DELIVERY' ? 'Almada' : null,
      addressPostal: r.delivery === 'DELIVERY' ? '2800-000' : null,
      etaMinutes: r.delivery === 'DELIVERY' ? 40 : 20,
      createdAt: r.at,
      items: { create: r.items.map((i) => ({ productId: i.product!.id, nameSnapshot: i.product!.name, priceCents: i.product!.priceCents, qty: i.qty })) },
      events: { create: { status: 'RECEIVED', createdAt: r.at } },
    },
  });
  n++;
}
await prisma.counter.update({ where: { id: 1 }, data: { value: n - 1 } });
console.log(`Seed demo: ${rows.length} pedidos criados (counter=${n - 1})`);
await prisma.$disconnect();
})();
