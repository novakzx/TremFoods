import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginClient } from './client-login';

export const metadata: Metadata = {
  title: 'Iniciar sessão',
  description: 'Inicie sessão na Trem Food para finalizar pedidos e acompanhar encomendas em tempo real.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="container-app flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-7 sm:p-9">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Iniciar sessão</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted">Bem-vindo de volta. O seu carrinho fica guardado.</p>
          <LoginClient />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Precisa de uma conta só para comprar? Pode pedir em <Link href="/registar" className="underline underline-offset-2">registo rápido</Link>.
        </p>
      </div>
    </div>
  );
}
