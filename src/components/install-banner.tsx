'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CONSENT_EVENT, CONSENT_KEY } from './cookie-consent';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'tf-install-dismissed';

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return '1';
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignorado */
  }
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [consented, setConsented] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (stored(DISMISSED_KEY)) return;
    setDismissed(false);
    // Nunca em cima do aviso de cookies: espera que esse seja fechado.
    setConsented(Boolean(stored(CONSENT_KEY)));
    const onConsent = () => setConsented(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      remember(DISMISSED_KEY);
      setDismissed(true);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS/Safari não dispara beforeinstallprompt — mostra instruções fixas.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !standalone) setIosHint(true);

    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || !consented || (!prompt && !iosHint)) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') remember(DISMISSED_KEY);
    setPrompt(null);
    setDismissed(true);
  };

  const dismiss = () => {
    remember(DISMISSED_KEY);
    setDismissed(true);
  };

  return (
    <div role="region" aria-label="Instalar aplicação" className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-line bg-surface p-3 pl-4 shadow-float">
      <p className="flex-1 text-xs leading-relaxed text-muted">
        {iosHint && !prompt
          ? 'Instale a app: no Safari toque em Partilhar → "Adicionar ao ecrã principal".'
          : 'Instale a app Trem Food para pedir mais depressa.'}
      </p>
      {prompt && (
        <button onClick={install} className="btn-primary btn-sm shrink-0">Instalar</button>
      )}
      <button onClick={dismiss} aria-label="Fechar" className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
