# Trem Food — Hamburgueria em Almada

Plataforma de e-commerce e encomendas para a Trem Food: cardápio, carrinho, checkout
com pagamentos portugueses, acompanhamento de pedidos em tempo real e painel de gestão.

Stack: **Next.js 14 (App Router) + React + TypeScript + Tailwind CSS**, **PostgreSQL + Prisma**,
**Redis (opcional, rate limiting)**, **Stripe** (cartão, MB WAY, Multibanco), nodemailer.
Pronto para deploy na Vercel.

## Funcionalidades

- Cardápio com pesquisa, filtros por categoria e fichas de produto (alergénios, tempos)
- Carrinho persistente (guest, 90 dias) com fusão na conta ao iniciar sessão
- Checkout: entrega (2,50 €, grátis ≥ 25 €) ou levantamento; dinheiro, cartão, MB WAY,
  referência Multibanco (Stripe); nota para a cozinha
- Pedidos com número único sequencial (`TF-000001`), estado em tempo real
  (Recebido → Em preparação → Saiu para entrega → Entregue / Cancelado) e linha do tempo
- Acompanhamento público por número + últimos 4 dígitos do telemóvel
- Contas: registo, verificação de e-mail, início de sessão, recuperação de palavra-passe,
  gestão de sessões (terminar outras / todas)
- Painel de administração com atualização de estados (refletida no cliente em segundos)
- Ecrã da cozinha (`/admin/cozinha`) para tablet: colunas Novos → Em preparação → A caminho,
  cronómetro por pedido (verde/amarelo/vermelho face ao tempo previsto), som a cada pedido novo
  (repete até alguém o começar), ecrã sempre ligado e botão "Cozinha cheia" (+10/+20/+30 min)
- Tempo estimado dinâmico: conforme a fila da cozinha (`etaFor` em `delivery-policy.ts`),
  mostrado na faixa de estado, no checkout e na página do pedido ("previsto ~21:10")
- Estafeta em tempo real: ao sair para entrega, o cartão da cozinha mostra um QR/link secreto
  (`/estafeta/<token>`, sem conta). O estafeta partilha a localização e confirma a entrega no
  telemóvel; o cliente vê-o num mapa (Leaflet + OpenStreetMap) na página do pedido e no
  acompanhamento. Link e posição são apagados quando a entrega termina
- Gestão completa do cardápio no admin: produtos (foto por URL, descrição, preço, flags, disponibilidade),
  categorias e adicionais por grupos (obrigatório/múltiplo, opções com preço extra; validados no servidor)
- PWA instalável (manifest + service worker com cache e atualização automática), SEO completo
  (sitemap, robots, llms.txt, Open Graph, schema.org), segurança (CSP, CSRF, rate limiting,
  sanitação, auditoria)

## Configuração

```bash
npm install
cp .env.example .env   # edite os valores
npx prisma migrate dev # cria o schema (PostgreSQL)
ADMIN_PASSWORD='uma-senha-forte-com-12+' npm run db:seed   # categorias, produtos, admin, contador
npm run dev            # http://localhost:3000
```

### Variáveis de ambiente principais

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | `postgresql://utilizador:palavra-passe@host:5432/tremfood` |
| `APP_URL` | URL pública (links nos e-mails) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | envio de e-mail (em desenvolvimento, sem SMTP, os links de verificação/reposição vêm na resposta da API; em produção nunca) |
| `MAIL_FROM` | remetente dos e-mails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pagamentos (sem Stripe, o checkout cai para dinheiro) |
| `REDIS_URL` | opcional — reservado para rate limiting multi-instância |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | administrador criado pelo seed. Sem `ADMIN_PASSWORD` (mínimo 12 caracteres) o admin **não** é criado — não há senha por omissão |

## Produção

```bash
npm run build && npm start     # Vercel: sem passos extra (build automático)
```

- O build (`scripts/db-sync.js`) sincroniza o schema **sem** `--accept-data-loss` (uma
  alteração destrutiva falha em vez de apagar dados) e corre o seed em modo seguro: só cria
  o que falta, nunca reescreve preços, fotos, adicionais ou produtos editados no painel.
  Para repor o cardápio exatamente como está em `prisma/seed.ts`: `npm run db:seed -- --overwrite`.
- Os mapas usam os tiles públicos do OpenStreetMap (sem chave). Com muito tráfego, troque o
  URL em `src/components/live-courier-map.tsx` por um fornecedor com chave (MapTiler, Mapbox…).
- Rate limiting corre em memória (mono-instância). Em múltiplas instâncias, ligue o
  rate limiting a um Redis partilhado (ver `src/infra/throttle.ts`).
- Configure o webhook do Stripe para `/api/payments/stripe/webhook` com os eventos
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `payment_intent.succeeded` e `payment_intent.payment_failed`.
- SMTP obrigatório em produção (os links de verificação nunca são devolvidos na resposta).
- A senha antiga por omissão do admin (`TrocarAdmin2026`) deixou de ser aceite no login.
  Se o admin ainda a usar, defina `ADMIN_PASSWORD` e volte a correr o seed (substitui-a),
  ou use "Esqueci-me da palavra-passe".

## Testes

```bash
# servidor em http://localhost:3000 e depois:
node e2e/smoke.mjs   # E2E: cardápio → carrinho (com adicionais) → registo → pedido → tracking → admin (usa Playwright)
node e2e/shots-menu.mjs  # screenshots do produto com adicionais, carrinho e editor do cardápio
```

A suíte assume o servidor de desenvolvimento (`npm run dev`) sem SMTP — só aí a API devolve
os links de verificação — e as credenciais de admin definidas em `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
Testes unitários: `npx tsx e2e/unit-hours.ts` e `npx tsx e2e/unit-metrics.ts`.

## Estrutura

- `prisma/` — schema e seed
- `src/app/` — páginas (App Router) e `src/app/api/` — API routes
- `src/domains/<contexto>/` — lógica por contexto de negócio (conta, menu, carrinho,
  pedidos, entrega, pagamentos, comunicações, admin) + `shared-kernel` (regras transversais)
- `src/infra/` — infraestrutura: config/env, prisma, respostas HTTP, logs, throttling, cliente HTTP
- `src/components/` — UI (header, menu, timeline, formulários)
- `public/` — imagens, ícones PWA, manifest, service worker, ficheiros SEO
- `e2e/` — Playwright (smoke + screenshots)
