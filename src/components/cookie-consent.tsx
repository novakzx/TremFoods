'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export const CONSENT_KEY = 'tf-cookie-consent';
export const CONSENT_EVENT = 'tf:consent';

// O site só usa cookies essenciais (sessão, carrinho, segurança): um aviso
// basta — não há escolhas a fazer.
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      /* armazenamento bloqueado — não insistir */
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'essential');
    } catch {
      /* ignorado */
    }
    setVisible(false);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[80] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-line bg-surface p-3 pl-4 shadow-float">
      <p className="flex-1 text-xs leading-relaxed text-muted">
        Usamos apenas cookies essenciais (sessão, carrinho e segurança).{' '}
        <Link href="/cookies" className="font-medium text-ink underline underline-offset-2">Saber mais</Link>
      </p>
      <button onClick={dismiss} className="btn-primary btn-sm shrink-0">OK</button>
    </div>
  );
}
