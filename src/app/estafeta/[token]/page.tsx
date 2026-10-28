import type { Metadata } from 'next';
import { CourierClient } from './courier-client';
import { findCourierOrder } from '@/domains/delivery/courier';
import { paymentMethodLabel } from '@/domains/payment/methods';
import { eur } from '@/domains/shared-kernel/money';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrega',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// Página do estafeta (link secreto por entrega, sem conta). Mostra só o
// necessário para entregar: morada, contacto, artigos e valor a cobrar.
export default async function CourierPage({ params }: { params: { token: string } }) {
  const order = await findCourierOrder(params.token);

  if (!order || order.status !== 'OUT_FOR_DELIVERY') {
    return (
      <div className="container-app max-w-md py-12">
        <div className="card p-6 text-center">
          <p className="font-display text-lg font-bold">Link de entrega inativo</p>
          <p className="mt-1 text-sm text-muted">A entrega já foi concluída ou o link não existe. Peça um novo na cozinha.</p>
        </div>
      </div>
    );
  }

  const address = [order.addressStreet, order.addressNumber].filter(Boolean).join(', ');
  const destination = [address, order.addressPostal, order.addressCity].filter(Boolean).join(', ');
  const toCollect = order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID';
  const payment = toCollect
    ? `Cobrar ${eur(order.totalCents)} em dinheiro`
    : order.paymentStatus === 'PAID'
      ? `${paymentMethodLabel(order.paymentMethod)} · já pago`
      : `${paymentMethodLabel(order.paymentMethod)} · pagamento por confirmar — fale com a loja`;

  return (
    <CourierClient
      token={params.token}
      order={{
        number: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: destination,
        mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
        note: order.note,
        items: order.items.map((i) => ({ qty: i.qty, name: i.nameSnapshot })),
        payment,
        toCollect,
      }}
    />
  );
}
