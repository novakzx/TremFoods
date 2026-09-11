'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="container-app flex justify-center py-16 sm:py-24">
      <div className="card max-w-md p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Ocorreu um erro</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Não foi possível carregar as informações desta página. Por favor, tente novamente ou volte à página inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => reset()} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
          <Link href="/" className="btn-secondary">
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
