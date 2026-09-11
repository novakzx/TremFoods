import type { Metadata } from 'next';
import { ForgotClient } from './client-forgot';

export const metadata: Metadata = {
  title: 'Recuperar palavra-passe',
  description: 'Recupere o acesso à sua conta Trem Food através de um link seguro enviado por e-mail.',
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <div className="container-app flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-7 sm:p-9">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Recuperar palavra-passe</h1>
          <p className="mt-1.5 mb-7 text-sm leading-relaxed text-muted">
            Indique o e-mail da sua conta e enviaremos um link seguro para definir uma nova palavra-passe.
          </p>
          <ForgotClient />
        </div>
      </div>
    </div>
  );
}
