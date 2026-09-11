'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Search, User, Menu, X, Download, Package, Receipt } from 'lucide-react';
import { CardapioSheet } from './cardapio-sheet';
import { apiGet } from '@/infra/http-client';

export function Header({ user, cartCount }: { user: { name: string; email: string; role: string } | null; cartCount: number }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(cartCount);
  const [deferred, setDeferred] = useState<Event | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => {
      apiGet<{ count: number }>('/api/cart').then((r) => {
        if (r.ok) setCount(r.data.count ?? 0);
      });
    };
    refresh();
    window.addEventListener('basket:changed', refresh);
    return () => window.removeEventListener('basket:changed', refresh);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const nav = [
    { href: '/', label: 'Início' },
    { href: '/cardapio', label: 'Cardápio' },
    { href: '/rastreamento', label: 'Rastrear pedido' },
  ];

  const install = async () => {
    const ev = deferred as (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null;
    if (ev) {
      ev.prompt();
      try { await ev.userChoice; } catch { /* ignorado */ }
      setDeferred(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-surface/85 shadow-sm backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Trem Food — início">
          <span className="rounded-full bg-brand p-[2px]">
            <img src="/img/brand/logo.png" alt="" className="h-8 w-8 rounded-full border-2 border-surface object-cover" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold tracking-tight">Trem Food</span>
            <span className="block text-[11px] text-muted">Hamburgueria · Almada</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                pathname === n.href ? 'bg-brand/10 text-brand' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {deferred && (
            <button onClick={install} className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink/80 transition-colors hover:border-brand/40 hover:text-brand sm:flex">
              <Download className="h-3.5 w-3.5" /> Instalar
            </button>
          )}
          <Link href="/cardapio" className="flex items-center gap-2 rounded-full px-2.5 py-2.5 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Pesquisar no cardápio">
            <Search className="h-5 w-5" />
            <span className="hidden text-sm font-medium xl:inline">Pesquisar</span>
          </Link>
          <Link href="/carrinho" className="relative flex items-center gap-2 rounded-full px-2.5 py-2.5 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Carrinho">
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-ink" style={{ height: 18 }}>
                  {count > 99 ? '99' : count}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-medium xl:inline">Carrinho</span>
          </Link>
          {user ? (
            <Link href="/conta" className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5" aria-label="A minha conta">
              <span className="hidden max-w-[140px] truncate lg:block">{user.name.split(' ')[0]}</span>
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <Link href="/login" className="hidden items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-surface transition-colors hover:bg-brand sm:flex">
              <User className="h-4 w-4" /> Entrar
            </Link>
          )}
          <button onClick={() => setOpen(!open)} className="rounded-full p-2.5 text-ink/70 hover:bg-ink/5 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="container-app flex flex-col gap-1 py-3" aria-label="Menu móvel">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-brand/5">
                {n.label === 'Cardápio' ? <Package className="h-4.5 w-4.5 text-brand" style={{ height: 18, width: 18 }} /> : n.label === 'Rastrear pedido' ? <Receipt className="h-4 w-4 text-brand" /> : null}
                {n.label}
              </Link>
            ))}
            {user ? (
              <Link href="/conta" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-brand/5">
                <User className="h-4 w-4 text-brand" /> A minha conta
              </Link>
            ) : (
              <Link href="/login" className="btn-primary mt-1 justify-center">
                <User className="h-4 w-4" /> Entrar ou criar conta
              </Link>
            )}
            {deferred && (
              <button onClick={install} className="btn-secondary mt-1 justify-center">
                <Download className="h-4 w-4" /> Instalar aplicação
              </button>
            )}
          </nav>
        </div>
      )}
      <CardapioSheet />
    </header>
  );
}
