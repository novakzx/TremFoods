import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loadBasket, summarizeBasket, addItem, setItemQuantity, removeItem } from '@/domains/basket/basket-store';
import { requireUser, verifyCsrf, secrets, cookieOptions, newBasketToken } from '@/domains/account/session';
import { addItemSchema, setItemSchema, removeItemSchema } from '@/domains/basket/validators';
import { logValidation } from '@/infra/logging';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { unitPriceCents } from '@/domains/menu/options';

export const dynamic = 'force-dynamic';

// Carrinho de quem faz o pedido: o da conta, ou o do cookie de visitante.
async function ownBasket() {
  const { user } = await requireUser();
  const cartToken = user ? null : cookies().get(secrets.CART_COOKIE)?.value ?? null;
  return { user, cartToken, cart: await loadBasket(user?.id ?? null, cartToken) };
}

export async function GET() {
  const { cart } = await ownBasket();
  const totals = summarizeBasket(cart);
  return NextResponse.json({
    count: totals.count,
    subtotalCents: totals.subtotalCents,
    items: cart.items.map((i) => ({
      id: i.id,
      qty: i.qty,
      unitPriceCents: unitPriceCents(i.product.priceCents, i.options),
      options: i.options,
      product: {
        id: i.product.id,
        slug: i.product.slug,
        name: i.product.name,
        priceCents: i.product.priceCents,
        image: i.product.image,
        available: i.product.available,
      },
    })),
  });
}

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { productId, qty, options } = parsed.data;

  const { user } = await requireUser();
  const cartToken = user ? null : newBasketToken();
  const result = await addItem(user?.id ?? null, cartToken, productId, qty, options ?? []);
  if (result.error) {
    return NextResponse.json({ error: { code: 'INVALID_OPTION', message: result.error } }, { status: 400 });
  }
  const cart = await loadBasket(user?.id ?? null, cartToken);
  const res = NextResponse.json({ ok: true, ...summarizeBasket(cart) });
  if (!user && cartToken) res.cookies.set(secrets.CART_COOKIE, cartToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 90 });
  return res;
}

// Quantidade por linha (o id da linha identifica o produto + combinação de
// opções — duas linhas do mesmo produto com escolhas diferentes são distintas).
export async function PATCH(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const body = await parseJson(req);
  const parsed = setItemSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const { itemId, qty } = parsed.data;
  const { user, cartToken, cart } = await ownBasket();
  if (!(await setItemQuantity(cart.id, itemId, qty))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Artigo não encontrado.' } }, { status: 404 });
  }
  const updated = await loadBasket(user?.id ?? null, cartToken);
  return NextResponse.json({ ok: true, ...summarizeBasket(updated) });
}

export async function DELETE(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const parsed = removeItemSchema.safeParse(await parseJson(req));
  if (!parsed.success) return VALIDATION_ERROR('Parâmetros inválidos.');

  const { user, cartToken, cart } = await ownBasket();
  if (!(await removeItem(cart.id, parsed.data.itemId))) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Artigo não encontrado.' } }, { status: 404 });
  }
  const updated = await loadBasket(user?.id ?? null, cartToken);
  return NextResponse.json({ ok: true, ...summarizeBasket(updated) });
}
