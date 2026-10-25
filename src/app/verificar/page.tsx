import type { Metadata } from 'next';
import { VerifyClient } from './client-verify';

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <div className="container-app flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Verificação de e-mail</h1>
        <div className="card p-6 sm:p-8">
          <VerifyClient />
        </div>
      </div>
    </div>
  );
}
