import type { Metadata } from 'next';
import { RegisterClient } from './client-register';

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie a sua conta Trem Food para comprar mais rápido, acompanhar pedidos em tempo real e rever o histórico.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="container-app flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-7 sm:p-9">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Criar conta</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted">Registo rápido — 30 segundos.</p>
          <RegisterClient />
        </div>
      </div>
    </div>
  );
}
