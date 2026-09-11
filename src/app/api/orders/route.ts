import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { requireUser, verifyCsrf, secrets } from '@/domains/account/session';
import { loadBasket, summarizeBasket, clearBasket } from '@/domains/basket/basket-store';
import { sendMail, orderConfirmationHtml } from '@/domains/comms/mailer';
import { beginPayment } from '@/domains/payment/gateway';
import { parseJson, VALIDATION_ERROR } from '@/infra/api-reply';
import { audit, log, logValidation } from '@/infra/logging';
import { getForUser } from '@/domains/orders/order-queries';
import { nextOrderNumber } from '@/domains/orders/order-registry';
import { LIFECYCLE } from '@/domains/orders/order-status';
import { checkoutSchema } from '@/domains/orders/validators';
import { unitPriceCents } from '@/domains/menu/options';
import { orderBlockReason } from '@/domains/shop/shop-policy';
import { eur } from '@/domains/shared-kernel/money';
import { DELIVERY_MINUTES, PICKUP_MINUTES, deliveryFeeFor } from '@/domains/delivery/delivery-policy';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { prisma } from '@/infra/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Inicie sessão para ver os seus pedidos.' } }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: true, events: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      number: o.number,
      status: o.status,
      statusLabel: LIFECYCLE[o.status]?.label ?? o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      deliveryMethod: o.deliveryMethod,
      totalCents: o.totalCents,
      itemsCount: o.items.reduce((s, i) => s + i.qty, 0),
      createdAt: o.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user, session } = await requireUser();
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Inicie sessão para finalizar a compra.' } }, { status: 401 });
  if (!user.emailVerifiedAt) {
    return NextResponse.json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirme o seu e-mail antes de fazer pedidos.' } }, { status: 403 });
  }

  const body = await parseJson(req);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    logValidation(parsed.error);
    return VALIDATION_ERROR(parsed.error.issues.map((i) => i.message).join(' • '));
  }
  const data = parsed.data;

  // A cozinha tem horário: pedidos fora da janela ou com a loja encerrada são recusados.
  const blockReason = await orderBlockReason();
  if (blockReason) {
    const message = blockReason === 'MANUAL'
      ? 'Estamos temporariamente encerrados. Volte em breve — pode ligar para 964 994 787.'
      : 'Estamos fechados de momento. Abrimos todos os dias às 06h30.';
    return NextResponse.json({ error: { code: 'CLOSED', message } }, { status: 403 });
  }

  // O carrinho vem SEMPRE do servidor — o total nunca é aceite do cliente.
  const cart = await loadBasket(user.id, null);
  const { subtotalCents } = summarizeBasket(cart);
  if (!cart.items.length) {
    return NextResponse.json({ error: { code: 'EMPTY_CART', message: 'O seu carrinho está vazio.' } }, { status: 400 });
  }
  const availableItems = cart.items.filter((i) => i.product.available);
  if (availableItems.length !== cart.items.length) {
    return NextResponse.json({ error: { code: 'UNAVAILABLE_ITEM', message: 'Um dos artigos do carrinho já não está disponível. Atualize o carrinho.' } }, { status: 409 });
  }

  const deliveryFeeCents = deliveryFeeFor(subtotalCents, data.deliveryMethod);
  const totalCents = subtotalCents + deliveryFeeCents;
  const number = await nextOrderNumber();
  const etaMinutes = data.deliveryMethod === 'DELIVERY' ? DELIVERY_MINUTES : PICKUP_MINUTES;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        userId: user.id,
        status: 'RECEIVED',
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PENDING',
        deliveryMethod: data.deliveryMethod,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || user.email,
        addressStreet: data.addressStreet || null,
        addressNumber: data.addressNumber || null,
        addressCity: data.addressCity || null,
        addressPostal: data.addressPostal || null,
        note: data.note || null,
        etaMinutes,
        items: {
          create: cart.items.map((i) => ({
            productId: i.product.id,
            nameSnapshot: i.product.name,
            // Preço unitário inclui os adicionais — snapshot, nunca recalculado.
            priceCents: unitPriceCents(i.product.priceCents, i.options),
            qty: i.qty,
            optionsJson: i.options.length ? (i.options as Prisma.InputJsonValue) : undefined,
          })),
        },
        events: { create: { status: 'RECEIVED', note: 'Pedido recebido com sucesso.' } },
      },
      include: { items: true },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  void clearBasket(user.id, null);
  await audit('order.created', req, user.id, user.email, { orderId: order.id, number, totalCents });

  // Pagamento
  let payment: { type: 'none' } | Awaited<ReturnType<typeof beginPayment>> = { type: 'none' };
  if (data.paymentMethod === 'CASH') {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING' } });
  } else {
    try {
      payment = await beginPayment({
        orderId: order.id,
        orderNumber: number,
        amountCents: totalCents,
        method: data.paymentMethod,
        customerEmail: data.customerEmail || user.email,
        customerName: data.customerName,
      });
      if (payment.type === 'multibanco') {
        await prisma.order.update({ where: { id: order.id }, data: { paymentMeta: payment as object } });
      }
    } catch (e) {
      const err = e as Error & { status?: number };
      log('warn', 'order.payment.failed', { orderId: order.id, error: err.message });
      // Pagamento indisponível: pedido fica em dinheiro pendente (o cliente é informado na UI).
      await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'CASH' } });
      payment = { type: 'none' };
    }
  }

  const orderView = await getForUser(number, user.id);
  const res = NextResponse.json({
    order: {
      number: orderView!.number,
      status: orderView!.status,
      statusLabel: LIFECYCLE[orderView!.status]?.label,
      totalCents: orderView!.totalCents,
      totalLabel: eur(orderView!.totalCents),
      paymentMethod: orderView!.paymentMethod,
      paymentLabel: paymentMethodLabel(orderView!.paymentMethod),
      deliveryMethod: orderView!.deliveryMethod,
      etaMinutes: orderView!.etaMinutes,
      paymentMeta: orderView!.paymentMeta,
    },
    payment,
  });
  return res;
}

export async function DELETE(req: Request) {
  if (!verifyCsrf(req)) return NextResponse.json({ error: { code: 'CSRF', message: 'Token de segurança inválido.' } }, { status: 403 });
  const { user } = await requireUser();
  const cartToken = cookies().get(secrets.CART_COOKIE)?.value ?? null;
  if (user) await clearBasket(user.id, null);
  else if (cartToken) await clearBasket(null, cartToken);
  return NextResponse.json({ ok: true });
}
