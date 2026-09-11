import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos e Condições',
  description: 'Termos e Condições de venda da Trem Food, Lda. — encomendas, pagamentos, entregas, levantamentos e devoluções.',
  alternates: { canonical: 'https://tremfood.pt/termos' },
};

export default function TermsPage() {
  return (
    <div className="container-app max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Termos e Condições</h1>
      <p className="mt-2 text-sm text-muted">Trem Food, Lda. · NIF 517 439 802 · Av. António José Gomes 6, 2805-085 Almada · Última atualização: 1 de setembro de 2026</p>

      <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-ink/80">
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">1. Âmbito</h2>
          <p>
            Estes Termos regulam as encomendas feitas no site tremfood.pt e na aplicação Trem Food.
            Ao fazer uma encomenda, o cliente aceita estes termos e a <Link href="/privacidade" className="underline underline-offset-2">Política de Privacidade</Link>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">2. Encomendas</h2>
          <p>
            A encomenda só é considerada aceite após confirmação por e-mail. O número de pedido (formato TF-000000)
            identifica a encomenda em toda a comunicação. Reservamo-nos o direito de recusar encomendas fora da
            zona de entrega ou em períodos de encerramento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">3. Preços e pagamento</h2>
          <p>
            Os preços são apresentados em euros, com IVA incluído, e correspondem ao momento da encomenda.
            Aceitamos dinheiro (na entrega ou no balcão), cartão, MB WAY e referência Multibanco, através da Stripe.
            A referência Multibanco tem validade de 2 dias; o pedido avança quando o pagamento é confirmado.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">4. Entregas e levantamentos</h2>
          <p>
            A taxa de entrega é de 2,50 €, gratuita em pedidos iguais ou superiores a 25,00 €. Os tempos estimados
            (40 min entrega, 20 min levantamento) são valores médios e podem variar em horas de ponta ou condições
            meteorológicas. É responsabilidade do cliente estar acessível no telefone e na morada indicadas.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">5. Qualidade e alergénios</h2>
          <p>
            Todos os artigos são preparados na mesma cozinha, pelo que podem conter vestígios de glúten, ovos,
            leite, soja e frutos de casca rija. Em caso de alergia ou intolerância, contacte a loja antes de encomendar.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">6. Devoluções e reembolsos</h2>
          <p>
            Se o seu pedido chegar errado, incompleto ou em más condições, contacte-nos no prazo de 24 horas
            pelo e-mail ou telefone indicados. Após verificação, procedemos ao reembolso ou substituição no prazo
            máximo de 14 dias, conforme o direito de consumo aplicável (DL n.º 24/2014, na redação atual).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">7. Conta e segurança</h2>
          <p>
            O cliente é responsável pela confidencialidade das suas credenciais. Comunicações de suporte nunca
            pedem a palavra-passe. Qualquer utilização suspeita deve ser reportada a <a href="mailto:ola@tremfood.pt" className="underline underline-offset-2">ola@tremfood.pt</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">8. Lei aplicável</h2>
          <p>
            Estes termos regem-se pelo direito português. Para litígios de consumo, o consumidor pode recorrer
            à plataforma europeia de resolução de litígios (ec.europa.eu/consumers/odr).
          </p>
        </section>
      </div>
    </div>
  );
}
