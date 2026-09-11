import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container-app flex justify-center py-16 sm:py-24">
      <div className="card max-w-md p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/40">
          <SearchX className="h-6 w-6" />
        </span>
        <p className="mt-4 font-display text-4xl font-extrabold tracking-tight">404</p>
        <h1 className="mt-1 font-display text-lg font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          O endereço que procura não existe ou foi movido. Experimente o cardápio ou volte ao início.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">Ir para o início</Link>
          <Link href="/cardapio" className="btn-secondary">Ver o cardápio</Link>
        </div>
      </div>
    </div>
  );
}
