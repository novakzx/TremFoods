'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'tf-install-dismissed';

export function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, '1');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS/Safari não dispara beforeinstallprompt — mostra instruções fixas.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !standalone) {
      setIosHint(true);
      setVisible(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
    setPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl shadow-ink/10">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-ink shadow-sm">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">Leve o Trem Food consigo</p>
          <p className="mt-0.5 text-xs text-muted">
            {iosHint
              ? 'No Safari: toque em Partilhar e escolha "Adicionar ao ecrã principal".'
              : 'Instale a aplicação para abrir mais rápido e receber notificações dos pedidos.'}
          </p>
          {prompt && (
            <button onClick={install} className="btn-primary mt-3 h-9 w-full text-xs">
              Instalar aplicação
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Fechar" className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
