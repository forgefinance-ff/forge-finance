# Forge Finance: status depois das correções

Data: 14/11/2026 · Commits `290a7ef` a `057b219` (13 commits) · Base: `audit/RELATORIO.md`

## Bugs e riscos da auditoria

| ID | Situação | Como foi resolvido | Verificado por |
|---|---|---|---|
| BUG-01 totais cortados em 1.000 | **Corrigido** | Somas no banco (`ff_totals`, `ff_category_totals`, `ff_daily/monthly_totals`, `ff_account_daily_net`); listas com `fetchAllRows` em dashboard, extrato, cartões, importação, MEI, raio-x, IA e bot | SQL: `ff_totals` = soma direta (R$ 61.157,77); tela Relatórios: R$ 56.574,43 até hoje + R$ 4.583,34 a vencer = R$ 61.157,77 |
| BUG-02 "1.500" = 1,50 | **Corrigido** | `parseAmount`/`parseMoney` reconhecem milhar; `MoneyInput` com centavos automáticos em todos os 13 campos de valor | 29 testes passam (antes: 3 falhas) |
| BUG-03 dois totais na mesma tela | **Corrigido** | Mesma fonte (banco) para os cartões e as bolhas | Navegador: os dois mostram R$ 56.574,43 |
| BUG-04 parcelas futuras nos totais | **Corrigido** | "Tudo" vai até hoje; "a vencer" separado em Relatórios, Extrato e Cartões | Navegador |
| BUG-05 data futura muda saldo de hoje | **Corrigido** | View `accounts_today` (`balance_today` × `balance_future`), lida por todas as telas e pelo bot | SQL (bloco com rollback): lançamento +40 dias não muda `balance_today` |
| BUG-06 exclusão de transferência não atômica | **Corrigido** | `ff_delete_transfer_group` | SQL com rollback: saldos voltam exatamente |
| BUG-07 cota da IA sem devolução | **Corrigido** | `refund_my_ai_quota` em erro do provedor, resposta vazia ou timeout | Revisão de código (sem chave da IA para testar ao vivo) |
| BUG-08 "R$ 50,00" recusado | **Corrigido** | Mesmo parser | Testes |
| BUG-09 campos sem rótulo | **Corrigido** | Rótulos em Contas, Investimentos, Categorias, Metas, Importar, Configurações, formulário de transação | Varredura do DOM em 15 telas: 0 campos sem rótulo |
| BUG-10 lint | **Corrigido** | 0 erros, 0 avisos | `eslint .` |
| BUG-11 mensagem do WhatsApp perdida | **Corrigido** | Estado `processing`/`done`; reprocessa após 2 min | Revisão de código |
| SEC-01 Next.js com RCE | **Corrigido no projeto** | `next 16.4.6`, React 19.3.1, zod 4.6, supabase-js 2.119 | `npm audit --omit=dev`: 0 vulnerabilidades. **Falta rodar `npm install` no seu PC** |
| SEC-02 sem recuperação de senha | **Corrigido** | `/esqueci-senha`, `/redefinir-senha`, `/auth/confirm` | Telas no navegador. Envio do e-mail: **teste com você** (docs/LANCAMENTO.md §3) |
| SEC-03 CLI em produção | **Corrigido** | `shadcn` em devDependencies; 6 dependências mortas removidas | `npm audit` |
| SEC-04 LGPD | **Corrigido** | "Baixar meus dados" (JSON, 15 tabelas) e "Excluir minha conta" (digitar EXCLUIR) | Exportação testada: 200, 15 tabelas, 0 erros. Exclusão não executada (é irreversível) |
| SEC-05 limitador em memória | **Corrigido** | `ff_rate_limit` no banco | Revisão de código |
| SEC-06 espaço no nome da variável | **Corrigido** | `.env.local` ajustado (sem expor valores) | — |
| SEC-07 Empresa sem bloqueio | **Corrigido** | Escopo Empresa verificado no servidor; com a cobrança desligada continua liberado | Revisão de código |

## Funcionalidades novas

- Editar transação (app e WhatsApp: "na verdade foram 48").
- Transferência entre contas próprias (app e WhatsApp), fora de receitas e despesas.
- Extrato redesenhado: mês a mês, resumo em uma linha, busca em todo o histórico, agrupado por dia, "A vencer" recolhido, duplicar.
- Orçamentos por categoria, com previsão de estouro, no dashboard e alerta no WhatsApp.
- Resumo semanal no WhatsApp (opt-in em Configurações > Avisos).
- Páginas de erro e 404 em português; monitoramento opcional (Sentry).
- Exclusão de cartão com confirmação; faturas futuras recolhidas.

## Testes executados nesta rodada

| Teste | Resultado |
|---|---|
| `tsc --noEmit` (app e e2e) | PASSOU |
| `eslint .` | PASSOU (0 erros, 0 avisos) |
| `npm test` (29 testes: valores, totais, orçamento, extrato, fatura, cobrança) | PASSOU |
| `npm audit --omit=dev` | PASSOU (0) |
| `next build` (webpack, fontes simuladas na VM) | PASSOU |
| Funções SQL novas (bloco com rollback, sem alterar dados) | PASSOU (11 verificações) |
| Editar transação pelo app (217,06 → 217,07 → 217,06) | PASSOU |
| Criar orçamento pelo app | PASSOU |
| Relatórios: totais iguais ao banco | PASSOU |
| Varredura de acessibilidade e rolagem lateral (15 telas, 320 e 390 px) | PASSOU |
| Exportar dados | PASSOU |
| E2E Playwright | NÃO EXECUTADO (a VM não baixa o navegador). Testes prontos em `e2e/` |
| WhatsApp e IA ao vivo | BLOQUEADO (sem `ANTHROPIC_API_KEY`) |
| Stripe modo teste | NÃO EXECUTADO (precisa das suas chaves de teste) |
| Lighthouse | NÃO EXECUTADO (precisa do build rodando no seu PC) |
| E-mail de recuperação de senha | NÃO EXECUTADO (enviaria e-mail para a sua conta) |

## Scorecard atualizado

| Área | Antes | Agora | O que falta para 10 |
|---|---|---|---|
| Design visual | 7,5 | 8,5 | Validar com usuários; telas do MEI no navegador |
| Experiência do usuário | 5,5 | 8,5 | Uso real (beta) |
| Mobile | 7 | 8,5 | Lighthouse mobile e teste no seu celular |
| Funcionalidades | 7 | 9 | — |
| Consistência financeira | 4 | 9 | E2E rodando no CI |
| WhatsApp e IA | 7 | 8 (estática) | Teste ao vivo (docs/LANCAMENTO.md §4) |
| Performance | 6 | 8 | Lighthouse ≥ 90 no build de produção |
| Segurança | 6 | 9 | `npm install` no seu PC e SMTP próprio |
| Acessibilidade | 6 | 8,5 | Lighthouse/axe e teste com leitor de tela |
| Prontidão comercial | 4 | 7 | Stripe em teste, cota do Supabase, Sentry, beta |

As notas que faltam dependem das etapas em `docs/LANCAMENTO.md`, que precisam das suas contas e chaves.

## Dados deixados no banco

- As 305 movimentações de demonstração (de antes da auditoria).
- Um orçamento de teste: Alimentação, R$ 800/mês (pode excluir em /orcamentos).
