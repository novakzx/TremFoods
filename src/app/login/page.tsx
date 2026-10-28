import type { Metadata } from 'next';
import { LoginClient } from './client-login';

export const metadata: Metadata = {
  title: 'Iniciar sessão',
  description: 'Inicie sessão na Trem Food para finalizar pedidos e acompanhar encomendas em tempo real.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="container-app flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-muted">O seu carrinho fica guardado.</p>
          <LoginClient />
        </div>
      </div>
    </div>
  );
}
