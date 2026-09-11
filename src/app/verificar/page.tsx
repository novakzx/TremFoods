import type { Metadata } from 'next';
import { VerifyClient } from './client-verify';

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <div className="container-app flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-display text-2xl font-extrabold tracking-tight">Verificação de e-mail</h1>
        <div className="card p-7 sm:p-9">
          <VerifyClient />
        </div>
      </div>
    </div>
  );
}
