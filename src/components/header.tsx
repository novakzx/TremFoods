'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User, Menu, X } from 'lucide-react';
import { apiGet } from '@/infra/http-client';

type HeaderUser = { name: string; email: string; role: string } | null;

export function Header({ user, cartCount }: { user: HeaderUser; cartCount: number }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(cartCount);
  const pathname = usePathname();

  useEffect(() => setCount(cartCount), [cartCount]);

  useEffect(() => {
    const refresh = () => {
      apiGet<{ count: number }>('/api/cart')
        .then((r) => {
          if (r.ok) setCount(r.data.count ?? 0);
        })
        .catch(() => {});
    };
    window.addEventListener('basket:changed', refresh);
    return () => window.removeEventListener('basket:changed', refresh);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const nav = [
    { href: '/cardapio', label: 'Cardápio' },
    { href: '/rastreamento', label: 'Acompanhar pedido' },
    ...(user ? [{ href: '/pedidos', label: 'Os meus pedidos' }] : []),
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Painel' }] : []),
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="container-app flex h-14 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Trem Food — início">
          <span className="rounded-full bg-brand p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
              aria-current={isActive(n.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(n.href) ? 'text-brand-deep' : 'text-ink/70 hover:text-ink'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/carrinho" className="relative flex h-10 items-center gap-2 rounded-lg px-2.5 text-ink/80 hover:bg-ink/5 hover:text-ink" aria-label={`Carrinho, ${count} ${count === 1 ? 'artigo' : 'artigos'}`}>
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-ink">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          {user ? (
            <Link href="/conta" className="hidden h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink/80 hover:bg-ink/5 sm:flex" aria-label="A minha conta">
              <User className="h-5 w-5" />
              <span className="hidden max-w-[120px] truncate lg:block">{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn-primary btn-sm hidden sm:inline-flex">Entrar</Link>
          )}
          <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-lg text-ink/80 hover:bg-ink/5 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="menu-movel">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-movel" className="border-t border-line bg-surface md:hidden" aria-label="Menu móvel">
          <div className="container-app flex flex-col py-2">
            {[{ href: '/', label: 'Início' }, ...nav].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-2 py-3 text-[15px] font-medium text-ink hover:bg-ink/5">
                {n.label}
              </Link>
            ))}
            {user ? (
              <Link href="/conta" className="rounded-lg px-2 py-3 text-[15px] font-medium text-ink hover:bg-ink/5">A minha conta</Link>
            ) : (
              <Link href="/login" className="btn-primary my-2">Entrar ou criar conta</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
