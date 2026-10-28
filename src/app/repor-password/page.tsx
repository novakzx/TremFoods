import type { Metadata } from 'next';
import { ResetClient } from './client-reset';

export const metadata: Metadata = {
  title: 'Definir nova palavra-passe',
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return (
    <div className="container-app flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Definir nova palavra-passe</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Escolha uma palavra-passe forte e diferente das anteriores.</p>
          <ResetClient />
        </div>
      </div>
    </div>
  );
}
