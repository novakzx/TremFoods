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
npm run db:seed        # categorias, produtos, admin, contador
npm run dev            # http://localhost:3000
```

### Variáveis de ambiente principais

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | `postgresql://utilizador:palavra-passe@host:5432/tremfood` |
| `AUTH_SECRET` | 64 hex aleatórios (sessões e CSRF) |
| `APP_URL` | URL pública (links nos e-mails) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | envio de e-mail (sem SMTP, os links de verificação são devolvidos na resposta de registo — apenas dev) |
| `MAIL_FROM` | remetente dos e-mails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pagamentos (sem Stripe, o checkout cai para dinheiro) |
| `REDIS_URL` | opcional — reservado para rate limiting multi-instância |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credenciais do administrador no seed (trocá-las sempre) |

## Produção

```bash
npm run build && npm start     # Vercel: sem passos extra (build automático)
```

- Rate limiting corre em memória (mono-instância). Em múltiplas instâncias, ligue o
  rate limiting a um Redis partilhado (ver `src/infra/throttle.ts`).
- Configure o webhook do Stripe para `/api/payments/stripe/webhook`.
- SMTP obrigatório em produção (os links de verificação nunca são devolvidos na resposta).
  Troque as credenciais do admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) antes do primeiro deploy.

## Testes

```bash
# servidor em http://localhost:3000 e depois:
node e2e/smoke.mjs   # E2E: cardápio → carrinho (com adicionais) → registo → pedido → tracking → admin (usa Playwright)
node e2e/shots-menu.mjs  # screenshots do produto com adicionais, carrinho e editor do cardápio
```

A suíte assume `NODE_ENV=production` com SMTP desconfigurado (links de desenvolvimento
devolvidos pela API) e as credenciais de admin do seed.

## Estrutura

- `prisma/` — schema e seed
- `src/app/` — páginas (App Router) e `src/app/api/` — API routes
- `src/domains/<contexto>/` — lógica por contexto de negócio (conta, menu, carrinho,
  pedidos, entrega, pagamentos, comunicações, admin) + `shared-kernel` (regras transversais)
- `src/infra/` — infraestrutura: config/env, prisma, respostas HTTP, logs, throttling, cliente HTTP
- `src/components/` — UI (header, menu, timeline, formulários)
- `public/` — imagens, ícones PWA, manifest, service worker, ficheiros SEO
- `e2e/` — Playwright (smoke + screenshots)
