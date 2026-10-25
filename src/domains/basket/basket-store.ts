import { Prisma } from '@prisma/client';
import { prisma } from '@/infra/db';
import { log } from '@/infra/logging';
import { validateSelection, unitPriceCents, type SelectedOption, type OptionSnapshot } from '@/domains/menu/options';

export type BasketSnapshot = {
  id: string;
  items: {
    id: string;
    qty: number;
    options: OptionSnapshot[];
    product: { id: string; name: string; priceCents: number; image: string; slug: string; description: string; available: boolean };
  }[];
};

export async function loadBasket(userId: string | null, sessionToken: string | null): Promise<BasketSnapshot> {
  if (!userId && !sessionToken) return { id: '', items: [] };
  const include = {
    items: {
      include: {
        product: { select: { id: true, name: true, priceCents: true, image: true, slug: true, description: true, available: true } },
      },
      orderBy: { id: 'asc' as const },
    },
  };
  const cart = (userId
    ? await prisma.cart.findUnique({ where: { userId }, include })
    : await prisma.cart.findUnique({ where: { sessionToken: sessionToken ?? undefined }, include }));
  if (!cart) return { id: '', items: [] };
  // A coluna optionsJson guarda o snapshot das opções; converte-se para o
  // contrato do carrinho (linhas sem adicionais têm [] e nunca undefined).
  return {
    id: cart.id,
    items: cart.items.map((i) => ({
      id: i.id,
      qty: i.qty,
      options: (i.optionsJson ?? []) as OptionSnapshot[],
      product: i.product,
    })),
  };
}

export function summarizeBasket(cart: { items: { qty: number; options: OptionSnapshot[] | null; product: { priceCents: number } }[] }) {
  // Preço unitário = produto + adicionais (snapshot guardado na linha) — o
  // cliente nunca envia valores; o servidor calcula sempre.
  const subtotal = cart.items.reduce((sum, i) => sum + unitPriceCents(i.product.priceCents, i.options) * i.qty, 0);
  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  return { subtotalCents: subtotal, count, hasDeliveryFee: subtotal > 0 };
}

// Adiciona (ou funde) uma linha. A combinação de opções é validada contra os
// grupos do produto — opções inválidas ou em falta fazem a operação falhar.
export async function addItem(userId: string | null, sessionToken: string | null, productId: string, qty: number, options: SelectedOption[] = []): Promise<{ error: string | null }> {
  const selection = await validateSelection(productId, options);
  if (!selection.ok) return { error: selection.message as string };
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { available: true } });
  if (!product || !product.available) return { error: 'Produto indisponível.' };

  const cartId = userId
    ? (await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } })).id
    : (await prisma.cart.upsert({ where: { sessionToken: sessionToken ?? '' }, update: {}, create: { sessionToken: sessionToken ?? '' } })).id;

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId_optionsKey: { cartId, productId, optionsKey: selection.key } },
  });
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: Math.min(existing.qty + qty, 20) } });
  } else {
    await prisma.cartItem.create({
      data: { cartId, productId, qty: Math.min(qty, 20), optionsKey: selection.key, optionsJson: selection.snapshot.length ? selection.snapshot : undefined },
    });
  }
  return { error: null };
}

// A linha só é alterada se pertencer ao carrinho de quem pede (cartId vem da
// sessão/cookie, nunca do cliente) — impede mexer em carrinhos alheios.
export async function setItemQuantity(cartId: string, cartItemId: string, qty: number): Promise<boolean> {
  if (!cartId) return false;
  const where = { id: cartItemId, cartId };
  const result = qty <= 0
    ? await prisma.cartItem.deleteMany({ where })
    : await prisma.cartItem.updateMany({ where, data: { qty: Math.min(qty, 20) } });
  return result.count > 0;
}

export async function removeItem(cartId: string, cartItemId: string): Promise<boolean> {
  if (!cartId) return false;
  const result = await prisma.cartItem.deleteMany({ where: { id: cartItemId, cartId } });
  return result.count > 0;
}

// Antes de fechar o pedido, revalida cada linha contra o cardápio atual:
// adicionais removidos/esgotados ou grupos alterados bloqueiam a linha, e os
// preços dos adicionais são os de agora (nunca um snapshot antigo mais barato).
export async function revalidateBasket(cart: BasketSnapshot): Promise<{ ok: true; cart: BasketSnapshot } | { ok: false; productName: string }> {
  const items: BasketSnapshot['items'] = [];
  for (const item of cart.items) {
    const selection = await validateSelection(item.product.id, item.options.map((o) => ({ itemId: o.itemId })));
    if (!selection.ok || !item.product.available) return { ok: false, productName: item.product.name };
    items.push({ ...item, options: selection.snapshot });
  }
  return { ok: true, cart: { ...cart, items } };
}

export async function clearBasket(userId: string | null, sessionToken: string | null) {
  const cart = userId
    ? await prisma.cart.findUnique({ where: { userId }, select: { id: true } })
    : await prisma.cart.findUnique({ where: { sessionToken: sessionToken ?? '' }, select: { id: true } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

// Ao entrar, junta o carrinho da sessão anónima ao carrinho do utilizador.
export async function absorbGuestBasket(userId: string, sessionToken: string | null) {
  if (!sessionToken) return;
  const guest = await prisma.cart.findUnique({ where: { sessionToken }, include: { items: true } });
  if (!guest?.items.length) return;

  const userCart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  for (const item of guest.items) {
    const optionsKey = item.optionsKey ?? '';
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId_optionsKey: { cartId: userCart.id, productId: item.productId, optionsKey } },
    });
    const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { available: true } });
    if (!product?.available) continue;
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: Math.min(existing.qty + item.qty, 20) } });
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCart.id, productId: item.productId, qty: Math.min(item.qty, 20), optionsKey, optionsJson: item.optionsJson as Prisma.InputJsonValue | undefined },
      });
    }
  }
  await prisma.cartItem.deleteMany({ where: { cartId: guest.id } });
  log('info', 'basket.absorbed', { guestItems: guest.items.length, userId });
}
