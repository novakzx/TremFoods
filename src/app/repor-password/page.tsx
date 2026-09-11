import type { Metadata } from 'next';
import { ResetClient } from './client-reset';

export const metadata: Metadata = {
  title: 'Definir nova palavra-passe',
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return (
    <div className="container-app flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-7 sm:p-9">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Definir nova palavra-passe</h1>
          <p className="mt-1.5 mb-7 text-sm text-muted">Escolha uma palavra-passe forte e diferente das anteriores.</p>
          <ResetClient />
        </div>
      </div>
    </div>
  );
}
