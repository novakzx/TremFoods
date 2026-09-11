import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sem ligação',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container-app flex justify-center py-16 sm:py-24">
      <div className="card max-w-md p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/40">
          <WifiOff className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">Está sem ligação</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          O cardápio que já visitou continua disponível offline, mas para fazer pedidos precisa de ligação à internet.
        </p>
        <Link href="/" className="btn-primary mx-auto mt-6">Tentar novamente</Link>
      </div>
    </div>
  );
}
