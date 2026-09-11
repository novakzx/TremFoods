import type { Metadata } from 'next';
import { TrackingClient } from './tracking-client';

export const metadata: Metadata = {
  title: 'Acompanhar pedido',
  description: 'Acompanhe o seu pedido da Trem Food em tempo real: recebido, em preparação, saiu para entrega ou pronto para levantamento.',
  alternates: { canonical: 'https://tremfood.pt/rastreamento' },
  openGraph: { url: 'https://tremfood.pt/rastreamento', title: 'Acompanhar pedido · Trem Food' },
};

export default function TrackingPage() {
  return <TrackingClient />;
}
