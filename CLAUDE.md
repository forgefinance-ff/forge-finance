# Forge Finance: instruções para o Claude Code

Leia também `docs/CONTEXTO-CONVERSA.md`: é o histórico completo do que já foi feito, das decisões e do que está pendente.

Para publicar em produção, siga `docs/PUBLICAR-PRODUCAO.md`.

## Quem é quem
- Guilherme e Thiago são sócios (são 3 no total). Fale com eles **sempre em português do Brasil**, de forma direta e prática.
- O produto é o **Forge Finance**, o financeiro do **MEI** pelo WhatsApp; as finanças pessoais vêm de bônus.
- A publicação (Vercel) é feita pelo amigo/sócio dev, a partir do pacote em `entrega/`.

## Stack
- **Front e servidor:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 e base-ui (`@base-ui/react`).
  - Os componentes de UI ficam em `components/ui`.
  - `components/ui/button.tsx` é próprio do projeto (`buttonVariants`). Não sobrescreva com o button do shadcn.
- **Banco e login:** Supabase, com RLS em tudo. São dois projetos:
  - **Produção (do Thiago, é o que roda hoje):** `ixgdxgfhpycaadoogsyz`.
  - **Teste (do Guilherme):** `niuaapeweqcbxpwfnnnj`. É o que o `.env.local` usa.
  - A service role só roda no servidor, via `lib/supabase/admin.ts`.
- **Totais e somas:** sempre pelas RPCs `ff_totals`, `ff_category_totals`, `ff_daily_totals`, `ff_monthly_totals` e `ff_account_daily_net`.
  - Para listar linhas, use `fetchAllRows`, porque o PostgREST corta em 1000 linhas.
- **Saldo de hoje:** vem da view `accounts_today` (`current_balance:balance_today`).
- **Ações de servidor:** devolvem `{ ok, error }`. Não lançam erro para a interface.
- **Outros serviços:**
  - WhatsApp pela Meta Cloud API (`lib/whatsapp/*`).
  - IA pela Anthropic (`lib/ai`, `lib/whatsapp/agent`).
  - Stripe pronto, mas **desligado** (`BILLING_ENABLED=false`).
  - Erros vão para o Sentry por fetch, em `lib/monitoring.ts` (sem SDK).

## Comandos
```bash
npm run dev        # servidor local (porta 3000)
npm run check      # tipos + lint + testes (84 passando) — rode antes de cada commit
npm run build
```
- No Windows, o `atualizar-e-rodar.bat` libera a porta 3000 e roda `npm install` e `npm run dev`.

## Regras
- **Segredos:**
  - Nunca imprima nem copie valores do `.env.local`.
  - Nunca coloque segredo no código, num commit ou no pacote de entrega.
- **Testes e cobranças:**
  - Não faça cobranças reais.
  - Não rode testes destrutivos em produção.
  - Não invente resultado de teste.
- **Migrations:** ficam em `supabase/migrations/` e precisam ser idempotentes.
  - As mais recentes já estão aplicadas no projeto de teste `niuaapeweqcbxpwfnnnj`: `20261114090000`, `20261114100000`, `20261115090000`, `20261115100000` e `20261115110000` (support_notify). Novas: `20261115120000_whatsapp_outbound` e `20261117090000_trial_monthly_summary`.
  - Na produção `ixgdxgfhpycaadoogsyz`, a `20261117090000_trial_monthly_summary` foi aplicada em 17/11. Confira as outras antes de publicar.
- **CI:** `.github/workflows` é protegido. O arquivo do CI fica em `docs/ci/ci.yml`.
- **Commits:** terminam com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01571UeCq69CRLECuF1YUNen
  ```
- **Depois de mudar o código, regere o pacote do amigo:**
  ```bash
  git diff --binary faf7376 HEAD > entrega/forge-finance-atualizacao.patch
  git archive --format=zip -o entrega/forge-finance-completo.zip HEAD
  ```
  - Atualize também `entrega/COMO-PUBLICAR.md`.
  - `faf7376` é a versão que o amigo tem.
