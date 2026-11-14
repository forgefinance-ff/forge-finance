# Forge Finance

Finanças pessoais e do MEI, com registro pelo WhatsApp.

Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind 4 · Stripe · Claude (IA) · Meta WhatsApp Cloud API.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (abaixo)
npm run dev                  # http://localhost:3000
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Checagem de tipos (TypeScript) |
| `npm run lint` | ESLint |
| `npm test` | Testes das regras financeiras (valores, totais, orçamento, fatura, extrato) |
| `npm run check` | Os três acima juntos (rode antes de cada deploy) |
| `npm run e2e` | Testes no navegador (Playwright). Veja `playwright.config.ts` |

## Arquitetura em 1 minuto

- **Banco é a fonte da verdade.** Tudo que mexe em saldo passa por funções
  `ff_*` do Postgres (atômicas, conferem o dono com `auth.uid()`).
  RLS ligado em todas as tabelas.
- **Totais sempre no banco** (`ff_totals`, `ff_category_totals`,
  `ff_daily_totals`, `ff_monthly_totals`, `ff_account_daily_net`), via
  `lib/totals.ts`. A API do Supabase devolve no máximo 1.000 linhas: nunca
  some transações no JavaScript. Para listar linhas, use `fetchAllRows`.
- **Saldo até hoje.** `accounts.current_balance` soma tudo; a view
  `accounts_today` separa `balance_today` (o que já aconteceu) de
  `balance_future` (agendado). O app lê a view. Relatórios "Tudo" vão até
  hoje; parcelas futuras aparecem como "a vencer".
- **Natureza da transação (`kind`).** `regular` entra no resultado;
  `contribution`, `loan`, `refund` ficam à parte; `card_payment` e
  `transfer` não contam (o dinheiro só mudou de lugar).
- **Camada de serviços** (`lib/services/*`): as mesmas regras para o app e
  para o bot do WhatsApp (`ff_bot_rpc`).
- **Valores digitados**: sempre com `components/ui/money-input.tsx`
  (centavos automáticos) e `parseAmount` no servidor (`lib/money.ts`).
- **Ações do servidor** devolvem `{ ok, error }`. Em produção o Next esconde
  a mensagem de erros lançados.

Pastas principais: `app/` (rotas), `components/`, `lib/` (dados e regras),
`supabase/migrations/` (banco, em ordem), `tests/` (unitários),
`e2e/` (navegador), `docs/` (guias).

## Banco (Supabase)

Rode as migrações de `supabase/migrations/` em ordem no SQL Editor (todas
são idempotentes). As duas mais recentes:

- `20261114090000_quality_pass.sql`: totais no banco, saldo até hoje,
  transferência entre contas, edição, exclusão atômica, cota da IA,
  limite de requisições, orçamentos, avisos, estado das mensagens do WhatsApp.
- `20261114100000_bot_ops_and_net.sql`: evolução do patrimônio e novas
  operações do bot.

Em **Authentication > URL Configuration**, adicione em *Redirect URLs*:
`http://localhost:3000/auth/confirm` e `https://SEU-DOMINIO/auth/confirm`
(necessário para "Esqueci minha senha").

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Bot, webhooks, cron, excluir conta. Nunca no navegador |
| `NEXT_PUBLIC_APP_URL` | sim em produção | Links enviados pelo bot |
| `CRON_SECRET` | sim em produção | Protege `/api/cron/*` |
| `ANTHROPIC_API_KEY`, `AI_MODEL`, `WHATSAPP_AI_MODEL` | para IA | Assistente e bot |
| `OPENAI_API_KEY`, `WHISPER_MODEL` | para áudio | Transcrição de áudios no WhatsApp |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`, `WHATSAPP_GRAPH_VERSION`, `NEXT_PUBLIC_WHATSAPP_NUMBER` | para WhatsApp | Meta Cloud API |
| `WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_WEEKLY_TEMPLATE`, `WHATSAPP_REMINDER_TEMPLATE_LANG` | recomendadas | Modelos aprovados na Meta (mensagens fora da janela de 24 h) |
| `BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | para cobrar | Ver `docs/ATIVAR-COBRANCA.md` |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | recomendadas | Monitoramento de erros (desligado sem elas) |

## Crons (vercel.json)

- `/api/cron/reminders`: todo dia 8h (Brasília), vencimentos.
- `/api/cron/weekly`: domingo 19h (Brasília), resumo semanal para quem ativou.

## Antes de publicar

Siga `docs/LANCAMENTO.md` (checklist da Fase 4).
