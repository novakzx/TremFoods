import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Política de Privacidade da Trem Food, Lda. — como recolhemos, usamos e protegemos os seus dados pessoais.',
  alternates: { canonical: 'https://tremfood.pt/privacidade' },
};

export default function PrivacyPage() {
  return (
    <div className="container-app max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted">Trem Food, Lda. · NIF 517 439 802 · Av. António José Gomes 6, 2805-085 Almada · Última atualização: 1 de setembro de 2026</p>

      <div className="prose-invert mt-8 space-y-8 text-[14px] leading-relaxed text-ink/80">
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">1. Responsável pelo tratamento</h2>
          <p>
            O responsável pelo tratamento dos dados pessoais é a <strong>Trem Food, Lda.</strong>, com sede na Av. António José Gomes 6,
            Loja C, 2800-123 Almada, NIF 517 439 802, contactável através de <a href="mailto:ola@tremfood.pt" className="underline underline-offset-2">ola@tremfood.pt</a>.
            Tratamos os seus dados em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) e a Lei n.º 58/2019.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">2. Dados que tratamos e finalidades</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Conta de cliente:</strong> nome, e-mail, palavra-passe cifrada e dados de sessão — para autenticação, gestão de pedidos e histórico de compras.</li>
            <li><strong>Pedidos:</strong> morada de entrega, telefone, artigos encomendados, notas, método de pagamento e estado do pedido — para cumprir o contrato de compra.</li>
            <li><strong>Pagamentos:</strong> os dados de cartão são processados pela Stripe (ou entidades emitentes da MB WAY / Multibanco); nós não armazenamos números de cartão.</li>
            <li><strong>Comunicações:</strong> e-mails transacionais (confirmação de pedido, estado, reposição de palavra-passe).</li>
            <li><strong>Técnica:</strong> endereço IP, agente do utilizador e registos de auditoria — para segurança, prevenção de fraude e diagnósticos.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">3. Base legal</h2>
          <p>
            Execução de contrato (compra e entrega), consentimento (comunicações e cookies não essenciais),
            interesses legítimos (segurança, prevenção de fraude e melhoria do serviço) e obrigações legais
            (faturação e contabilidade).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">4. Conservação</h2>
          <p>
            Dados de conta: enquanto a conta estiver ativa. Dados de pedidos e faturação: 10 anos (obrigações
            fiscais). Registos de sessão e auditoria: 24 meses. Pode pedir a eliminação da conta a qualquer momento;
            os dados com obrigação legal de conservação serão mantidos apenas pelo período exigido por lei.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">5. Partilha de dados</h2>
          <p>
            Partilhamos dados apenas com: prestadores de pagamento (Stripe, SIBS/MB WAY), fornecedores de e-mail
            transacional e de alojamento, e autoridades quando exigido por lei. Não vendemos dados a terceiros.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">6. Os seus direitos</h2>
          <p>
            Pode exercer os direitos de acesso, retificação, apagamento, limitação, portabilidade e oposição,
            bem como retirar o consentimento, escrevendo para <a href="mailto:ola@tremfood.pt" className="underline underline-offset-2">ola@tremfood.pt</a>.
            Tem ainda o direito de apresentar reclamação junto da CNPD (cnpd.pt).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">7. Segurança</h2>
          <p>
            Aplicamos medidas técnicas e organizativas adequadas: cifragem de palavras-passe e tokens de sessão,
            ligações HTTPS, controlo de acessos por função, registo de auditoria e monitorização de incidentes.
          </p>
        </section>

        <p className="border-t border-line pt-6 text-sm text-muted">
          Para reclamações sobre o serviço, contacte-nos. Para reclamações de privacidade, use <a href="mailto:ola@tremfood.pt" className="underline underline-offset-2">ola@tremfood.pt</a>.
          Veja também a <Link href="/cookies" className="underline underline-offset-2">Política de Cookies</Link> e os <Link href="/termos" className="underline underline-offset-2">Termos e Condições</Link>.
        </p>
      </div>
    </div>
  );
}
