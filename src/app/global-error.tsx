'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html lang="pt-PT">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] p-4 text-[#1C1A16]">
        <div className="w-full max-w-md rounded-2xl border border-[#E8E4DA] bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold">Ocorreu um erro inesperado</h1>
          <p className="mt-3 text-sm text-[#7A7568]">
            Lamentamos o incómodo. Por favor, recarregue a página para continuar.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#E9A400] px-5 py-2.5 text-sm font-bold text-[#221800] hover:bg-[#D49300]"
          >
            Recarregar página
          </button>
        </div>
      </body>
    </html>
  );
}
