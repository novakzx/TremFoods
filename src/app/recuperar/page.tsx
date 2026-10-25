import type { Metadata } from 'next';
import { ForgotClient } from './client-forgot';

export const metadata: Metadata = {
  title: 'Recuperar palavra-passe',
  description: 'Recupere o acesso à sua conta Trem Food através de um link seguro enviado por e-mail.',
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <div className="container-app flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Recuperar palavra-passe</h1>
          <p className="mb-6 mt-1 text-sm leading-relaxed text-muted">
            Indique o e-mail da sua conta e enviaremos um link seguro para definir uma nova palavra-passe.
          </p>
          <ForgotClient />
        </div>
      </div>
    </div>
  );
}
