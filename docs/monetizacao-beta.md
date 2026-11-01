# Forge Finance — monetização e beta

## Estado atual

- Beta gratuito; não há checkout, gateway ou cobrança recorrente implementados.
- Planos previstos: Free (R$ 0), Plus (hipótese R$ 19,90/mês) e Business (hipótese R$ 79,90/mês).
- Preços são apenas referências de produto e não devem ser divulgados como ofertas ativas.
- O plano Free recebe 10 consultas de assistente por mês, desde que a integração de IA esteja configurada. O endpoint mantém também o limite por minuto existente.
- Plus e Business são planos futuros; a interface não permite comprá-los nem atribuí-los à conta.

## Modelo de dados

- `plans`: catálogo, preço de referência, recursos e cota mensal de IA.
- `user_entitlements`: plano efetivo e estado de acesso do usuário. Não existe escrita direta permitida a usuários autenticados.
- `usage_records`: contador atômico por usuário, recurso e mês UTC.
- Trigger em `auth.users` provisiona o acesso beta no cadastro; a migration também faz backfill idempotente das contas existentes.
- `ensure_my_beta_entitlement()` repara uma permissão beta ausente para o usuário autenticado.
- `consume_my_ai_quota()` incrementa a cota de forma atômica e lê o limite do banco.

## Aplicar a migration

Execute `supabase/migrations/20261018090000_billing_foundation.sql` no SQL Editor do projeto Supabase correto ou use o fluxo de migrations já adotado pelo repositório. Faça backup e revise o SQL antes de aplicar em produção. O arquivo ZIP não aplica migrations remotamente.

## Teste local

1. Configure `.env.local` localmente com as variáveis Supabase já usadas pelo projeto.
2. Aplique a migration no Supabase de desenvolvimento.
3. Execute `npm install`, `npx tsc --noEmit` e `npm run build`.
4. Entre com uma conta de teste e visite `/planos` e `/assinatura`.
5. Se `ANTHROPIC_API_KEY` estiver configurada, teste consultas em `/api/ai/assistant`; confirme que a cota mensal é respeitada. Sem a chave, o endpoint continua desativado como antes.
6. Teste isolamento de dados e tentativa de atualização de `user_entitlements` com duas contas de teste.

## Segurança

- O navegador não pode alterar plano, status, cota nem contadores.
- O usuário lê apenas seu próprio entitlement e seus próprios registros de consumo.
- O RPC de consumo deriva usuário via `auth.uid()` e consulta limite no banco; não aceita limite enviado pelo cliente.
- `SECURITY DEFINER` usa `search_path` vazio e execução restrita a funções necessárias.
- A cota é contabilizada antes da chamada ao provedor; erros do provedor também consomem uma tentativa. Isso evita abuso de custo, mas pode consumir uma unidade em falha transitória.
- O rate limit de seis chamadas por minuto continua em memória e não é compartilhado entre instâncias. Em produção, substitua por limitador distribuído.

## Gateway futuro: Mercado Pago vs. Stripe

Nenhum SDK foi instalado e nenhum gateway foi integrado. Antes da decisão, verificar a documentação oficial e os preços vigentes no Brasil. Comparar recorrência, checkout hospedado, webhooks assinados, cancelamento, reembolso, recuperação de pagamento, tarifas e suporte fiscal. Usar ambiente sandbox e validar idempotência de webhooks. Nunca confiar em redirecionamento do checkout como prova de pagamento; o estado futuro deverá ser atualizado por webhook verificado no servidor.

## Limitações conhecidas

- Recursos avançados de Plus/Business são apenas planejados.
- Não há organizações/membros empresariais implementados nesta etapa.
- A cota mensal está no banco; o limitador por minuto do endpoint segue em memória.
- Testes de integração real exigem projeto Supabase de desenvolvimento e duas contas de teste.

## Referências oficiais para a escolha futura do gateway

- Mercado Pago — API de Assinaturas: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/overview
- Mercado Pago — visão geral de assinaturas: https://www.mercadopago.com.br/developers/en/docs/subscriptions/overview
- Stripe Billing — preços publicados: https://stripe.com/br/billing/pricing
- Stripe Payments — preços publicados no Brasil: https://stripe.com/br/pricing

Na consulta realizada em 17/10/2026, a documentação oficial do Mercado Pago descreve criação, consulta e atualização de assinaturas e planos recorrentes. A página brasileira da Stripe apresenta Billing a 0,7% do volume de Billing e processamento de cartões nacionais a 3,99% + R$ 0,39 por cobrança bem-sucedida, sujeito a confirmação antes da contratação. Compare o custo total, porque a taxa de Billing pode ser adicional ao processamento. Os preços do Mercado Pago dependem do produto e das condições aplicáveis à conta; devem ser confirmados na página oficial de tarifas e no painel da conta.
