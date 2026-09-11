'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'tf-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const choose = (value: string) => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl shadow-ink/10">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-ink shadow-sm">
          <Cookie className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">Cookies</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Usamos cookies essenciais (sessão, carrinho e segurança) — não pode desativá-los. Não usamos cookies de
            publicidade nem de terceiros nesta versão do site.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => choose('all')} className="btn-primary h-9 px-4 text-xs">
              Aceitar todos
            </button>
            <button onClick={() => choose('essential')} className="btn-secondary h-9 px-4 text-xs">
              Só essenciais
            </button>
            <Link href="/cookies" onClick={() => setVisible(false)} className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink">
              Política de cookies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
