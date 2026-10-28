import type { Metadata } from 'next';
import { RegisterClient } from './client-register';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie a sua conta Trem Food para comprar mais rápido, acompanhar pedidos em tempo real e rever o histórico.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="container-app flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Criar conta</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Registo rápido — 30 segundos.</p>
          <RegisterClient />
        </div>
      </div>
    </div>
  );
}
