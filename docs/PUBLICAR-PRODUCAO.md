# Roteiro para o Claude: publicar este pacote em produção

Você é o Claude ajudando o Thiago, sócio do Forge Finance. Fale em português do Brasil, de forma direta. Siga as etapas na ordem e diga em qual etapa está.

## O que este pacote traz
- **Planos:** Forge Free, Forge Pessoal (R$ 19,90/mês ou R$ 199/ano) e Forge MEI (R$ 29,90/mês ou R$ 299/ano). O id `pro` no banco passou a ser o Forge MEI.
- **Lançamento:** textos de beta removidos, `/termos`, `/privacidade` atualizada, `robots.txt` e `sitemap.xml`.
- **Pix Automático (opcional):** assinatura também por Pix, ligada por `STRIPE_PIX_ENABLED`. Fica desligado até ser testado.
- **Custos:** aba `/admin/custos`, com tokens de IA e mensagens do WhatsApp por usuário.

## Regras que valem o tempo todo
1. **Produção:** o Supabase oficial é `ixgdxgfhpycaadoogsyz` e o site é `https://www.forgefinance.com.br`. O projeto `niuaapeweqcbxpwfnnnj` é o de teste do Guilherme.
2. **Peça o "ok" do Thiago nesta conversa antes de cada um destes passos:** rodar SQL que altera a produção, mudar variável na Vercel, fazer merge na `main` e publicar em produção.
3. **Não ligue a cobrança.** `BILLING_ENABLED` continua `false` em Production. Ligar é uma decisão separada (Etapa 7).
4. **Não faça cobrança real**, não apague dados e não rode teste destrutivo em produção.
5. **Nunca mostre nem copie segredos** (`.env.local`, chaves e tokens). Não coloque segredo em commit.
6. **Não invente resultado de teste.** Se não conseguir testar algo, diga isso ao Thiago.

## Etapa 1: Colocar o código no repositório
1. Peça ao Thiago a pasta do repositório oficial e rode `git status`. Se houver alteração não salva, pare e pergunte o que fazer.
2. Atualize a `main` e crie a branch `lancamento-planos-custos`.
3. Copie os arquivos do pacote por cima do repositório. Não apague arquivos que só existem no repositório.
4. Rode `git diff --stat main` e leia as mudanças. **O pacote partiu da versão de 18/11/2026.** Se a `main` recebeu commits depois disso, o pacote pode desfazer esse trabalho: nesse caso, junte as duas versões à mão e mostre ao Thiago o que foi combinado.
5. Rode `npm install`, `npm run check` e `npm run build`. Esperado: 84 testes passando e build sem erro. Se falhar, corrija antes de continuar.

## Etapa 2: Conferir o banco oficial (só leitura)
1. Confirme com o Thiago que o projeto aberto é o `ixgdxgfhpycaadoogsyz`.
2. Rode `supabase/verificar-producao.sql` no SQL Editor. Ele não altera nada.
3. Mostre ao Thiago quais itens estão como `FALTA` e os números de `INFO`.

## Etapa 3: Backup
Antes de alterar o banco, confirme com o Thiago que existe um backup recente em **Supabase > Database > Backups**. Se não houver, faça um antes de continuar, por exemplo com `pg_dump` ou com o workflow descrito em `docs/ATIVAR-COBRANCA.md`.

## Etapa 4: Aplicar as migrations que faltam
Rode **só as que estão como `FALTA`**, nesta ordem, uma de cada vez, a partir de `supabase/migrations/`:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `20261115090000_admin_panel.sql` | Painel admin |
| 2 | `20261115100000_support_chat.sql` | Chat de suporte |
| 3 | `20261115110000_support_notify.sql` | Aviso de suporte para a equipe |
| 4 | `20261115120000_whatsapp_outbound.sql` | Contador de envios do WhatsApp |
| 5 | `20261117090000_trial_monthly_summary.sql` | Teste grátis e resumo do mês |
| 6 | `20261118090000_agenda.sql` | Agenda |
| 7 | `20261118100000_security_fixes.sql` | Correções de segurança |
| 8 | `20261118110000_planos_pessoal_mei.sql` | Planos novos |
| 9 | `20261118120000_usage_costs.sql` | Contador de custos |

- Todas podem rodar de novo sem duplicar dados. O aviso "destructive operation" do Supabase é esperado em `drop trigger`, `revoke` e limpezas idempotentes. A `security_fixes` apaga só registros de limite de uso com mais de 2 dias.
- **Atenção à ordem com o código:** a `security_fixes` tira do navegador as funções `refund_my_ai_quota` e `ff_rate_limit`. Confira se o código que está no ar já usa `ff_rate_limit_for` e `ff_refund_ai_quota`. Se ainda não usar, aplique essa migration logo antes de publicar o código novo, para o limite de uso e a cota de IA não falharem nesse intervalo.
- Rode `supabase/verificar-producao.sql` de novo. Todos os itens devem ficar `APLICADA`.

## Etapa 5: Configurar a Vercel
Peça ao Thiago para conferir ou preencher. Mudança em `NEXT_PUBLIC_*` só vale depois de um novo deploy.

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://www.forgefinance.com.br` |
| `BILLING_ENABLED` | `false` |
| `ADMIN_EMAILS` | E-mails dos 3 sócios, separados por vírgula |
| `NEXT_PUBLIC_SELLER_CPF` | CPF do Thiago (fica público no site e nos Termos) |
| `NEXT_PUBLIC_SELLER_ADDRESS` | Endereço do Thiago (fica público no site e nos Termos) |
| `NEXT_PUBLIC_GOOGLE_AUTH` | `true` |
| `WHATSAPP_MONTHLY_TEMPLATE` | Nome do modelo aprovado na Meta, se existir |
| `ADMIN_USD_BRL` | Opcional: cotação do dólar (padrão 5.15) |
| `STRIPE_PIX_ENABLED` | `false` até o Pix estar ativo e testado no Stripe (ver `docs/ATIVAR-COBRANCA.md` → Pix Automático) |

`ADMIN_AI_COST_PER_REQUEST` e `STRIPE_PRICE_PRO_*` não são mais usadas.

## Etapa 6: Testar antes de publicar
1. Publique a branch em **Preview** na Vercel.
2. Teste com a conta do próprio Thiago e anote o resultado de cada item:
   - [ ] A página inicial mostra Forge Pessoal e Forge MEI lado a lado, sem a palavra "beta".
   - [ ] `/termos` e `/privacidade` abrem, e o rodapé mostra os dados do vendedor.
   - [ ] O cadastro mostra o aviso dos Termos.
   - [ ] `/planos` mostra Free, Pessoal e MEI com os preços certos.
   - [ ] `/admin` abre sem erro para os e-mails de `ADMIN_EMAILS` e dá 404 para os outros.
   - [ ] Depois de uma pergunta ao assistente, `/admin/custos` mostra tokens e custo de IA para essa conta.
   - [ ] Depois de uma mensagem ao bot, `/admin/custos` mostra mensagens recebidas e enviadas.
   - [ ] A aba `/agenda` abre e salva um evento de teste.
3. Mostre o resultado ao Thiago. Com o "ok" dele, faça o merge na `main` e publique em produção.
4. Repita os testes principais em `https://www.forgefinance.com.br` e acompanhe os erros no Sentry e na Vercel.

## Etapa 7: Antes de ligar a cobrança (não faça sem pedido do Thiago)
Siga `docs/ATIVAR-COBRANCA.md` e `docs/LANCAMENTO-PUBLICO.md`. Antes, o Thiago precisa decidir:
1. **Preço do MEI:** R$ 29,90 foi o definido pelo Guilherme, mas `docs/BRIEF-CRESCIMENTO.md` previa R$ 39,90.
2. **Contas com o teste vencido:** ao ligar a cobrança, essas contas perdem na hora o WhatsApp e o modo Empresa. O número aparece em `verificar-producao.sql`. Pergunte se ele quer avisar essas pessoas ou estender o teste.
3. **Stripe:** criar a conta no nome dele, os 4 preços e a troca de plano no portal, e testar tudo em modo de teste. Se for aceitar Pix, testar também a assinatura com Pix Automático e só então ligar `STRIPE_PIX_ENABLED`.
4. **Jurídico:** um advogado deve revisar `/termos` e `/privacidade`.

## Se algo der errado
- **Código:** na Vercel, use **Instant Rollback** para voltar ao deploy anterior.
- **Nome e preço do plano:** com o "ok" do Thiago, rode:
  ```sql
  update public.plans set name = 'Forge Pro', monthly_price_cents = 1990, updated_at = now() where id = 'pro';
  ```
- **Banco:** as migrations só acrescentam estruturas. Não apague tabelas para desfazer; se precisar voltar o banco, fale com o Thiago e use o backup da Etapa 3.
