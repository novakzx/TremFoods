'use client';

import { useEffect } from 'react';

/** Regista o service worker e ativa a atualização automática. */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // Atualização automática: o novo worker assume e a página recarrega uma vez.
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('trem:update'));
            }
          });
        });
      },
      () => {
        /* registo indisponível (file:// ou browser sem suporte) — sem impacto */
      },
    );
  }, []);
  return null;
}
