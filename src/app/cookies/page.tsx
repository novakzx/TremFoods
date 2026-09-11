import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Como a Trem Food utiliza cookies e tecnologias semelhantes no site e na aplicação.',
  alternates: { canonical: 'https://tremfood.pt/cookies' },
};

export default function CookiesPage() {
  return (
    <div className="container-app max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Política de Cookies</h1>
      <p className="mt-2 text-sm text-muted">Trem Food, Lda. · Última atualização: 1 de setembro de 2026</p>

      <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-ink/80">
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">1. O que são cookies</h2>
          <p>
            Cookies são pequenos ficheiros guardados no seu dispositivo. A Trem Food usa cookies estritamente
            necessários para o funcionamento do serviço e, mediante consentimento, cookies de análise.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">2. Cookies que utilizamos</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>trem_session</strong> (necessário, HttpOnly): mantém a sua sessão iniciada com segurança.</li>
            <li><strong>trem_csrf</strong> (necessário): proteção contra pedidos falsos entre sites (CSRF).</li>
            <li><strong>trem_cart</strong> (necessário): guarda o carrinho entre visitas, mesmo sem conta.</li>
            <li><strong>Análise</strong> (opcional): estatísticas anónimas de utilização, apenas com o seu consentimento.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">3. Gestão de cookies</h2>
          <p>
            Pode apagar ou bloquear cookies nas definições do navegador. Sem os cookies necessários, o carrinho e
            o início de sessão deixam de funcionar corretamente.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">4. Contactos</h2>
          <p>
            Dúvidas sobre esta política: <a href="mailto:ola@tremfood.pt" className="underline underline-offset-2">ola@tremfood.pt</a>.
            Consulte também a <Link href="/privacidade" className="underline underline-offset-2">Política de Privacidade</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
