# Auditoria do Forge Finance

Data: 14/11/2026 · Ambiente: desenvolvimento local (`next dev`, Windows) + Supabase do projeto `forge-finance` + VM Linux para testes · Commit auditado: `37eec33`

> Regra seguida: nenhum código de produção foi alterado durante a auditoria. Foram criados apenas este relatório e testes isolados em `tests/audit/`. Os dados de teste de volume (800 lançamentos) foram inseridos, usados e apagados. As 305 movimentações de demonstração criadas antes da auditoria continuam no banco (marcadas com `created_at = 2026-11-13 03:00:00+00`).

---

## A. Resumo executivo

**Estado geral.** O Forge tem uma base técnica melhor do que a média de MVPs: banco com RLS em todas as tabelas, funções SQL que validam o dono de cada registro, webhooks assinados e idempotentes, e um agente de WhatsApp bem desenhado (consulta números com ferramentas, prepara ações e pede confirmação). O visual foi refeito recentemente e está moderno.

O problema é a **precisão financeira em escala** e a falta de **funções básicas** que qualquer usuário pagante espera. Hoje o app mostra números errados a partir de 1.000 lançamentos, grava R$ 1,50 quando a pessoa digita "1.500" em vários formulários, não deixa editar uma transação nem transferir entre as próprias contas e não tem recuperação de senha.

**Pontos fortes**
- Segurança de dados bem pensada: RLS ativo nas 25 tabelas (verificado no banco), gatilho que impede usar conta ou categoria de outro usuário, funções `ff_*` que validam `auth.uid()`.
- Integrações robustas: assinatura HMAC com comparação em tempo constante (Meta e Stripe), deduplicação de webhooks, cron protegido por segredo.
- Agente do WhatsApp com regras corretas: números vêm de ferramentas, o modelo só usa referências internas (A1, T1), ações ficam pendentes e têm "Desfazer".
- Modelo financeiro do cartão correto: compra vira despesa na data, pagamento da fatura não duplica, estorno reduz (testado).
- Valores em `numeric(14,2)` e atualização atômica de saldo.

**Pontos fracos**
- Consultas sem paginação e sem agregação no banco: os totais ficam errados acima de 1.000 lançamentos (provado).
- Interpretação de valores digitados inconsistente entre formulários.
- Faltam funções essenciais: editar transação, transferência entre contas, recuperação de senha, busca e paginação do extrato.
- Totais de "Tudo" misturam parcelas futuras com o que já aconteceu.
- Dependências com vulnerabilidades críticas (Next.js).

**Riscos críticos**
1. Next.js 16.2.12 com CVEs críticas de execução remota de código.
2. Números financeiros errados para usuários com histórico longo.
3. Valores gravados 1.000× menores em formulários de texto.
4. Sem recuperação de senha: usuário que esquece a senha perde o acesso.

**Maiores oportunidades**
- O WhatsApp já é o diferencial. Completar o ciclo (editar, transferir, "na verdade foram 48") torna o produto difícil de copiar.
- Agregar no banco: resolve correção e performance de uma vez.
- Orçamento por categoria com alerta no WhatsApp ("faltam R$ 80 de Delivery este mês") daria motivo diário para abrir o app.

**Recomendação de lançamento:** **não lançar para pagantes ainda.** Corrigir os P0 (seção G). Depois disso, o Forge está em condição de um beta pago com poucas dezenas de usuários.

---

## B. Scorecard

| Área | Nota | Justificativa (evidência) |
|---|---|---|
| Design visual | 7,5 | Redesign consistente em landing, login, dashboard e relatórios. Telas internas antigas (Contas, Investimentos, formulários) ainda destoam (títulos, campos sem rótulo, cards com KPIs grandes repetidos). |
| Experiência do usuário | 5,5 | Fluxos principais existem, mas faltam editar, transferir, recuperar senha e buscar. Em Transações no celular, 4 cartões de totais vêm antes da lista. |
| Experiência mobile | 7 | Sem rolagem horizontal em nenhuma das 16 telas a 320 e 390 px (medido). Barra inferior boa. Alvos de toque pequenos e formulários longos. |
| Funcionalidades | 7 | Escopo amplo (pessoal, MEI, cartões, importação, IA). Lacunas básicas listadas acima. |
| Consistência financeira | 4 | Truncamento em 1.000 linhas, "1.500" vira 1,50, totais com parcelas futuras, dois totais diferentes na mesma tela (provados). |
| WhatsApp e IA | 7 (estática) | Arquitetura correta e segura. **Não executado ao vivo**: não há chave da IA nem número da Meta no ambiente. |
| Performance | 6 | 400–600 ms por página em dev após otimização. Todas as transações são baixadas para calcular no servidor; não escala. |
| Segurança | 6 | Base boa (RLS, webhooks, funções). Rebaixada pela CVE crítica do Next, sem recuperação de senha e por dependências de CLI em produção. |
| Acessibilidade | 6 | Respeita "reduzir movimento", foco visível. 16 campos sem rótulo acessível em 5 telas e alvos menores que 24 px. |
| Prontidão comercial | 4 | P0 abertos; o módulo Empresa, vendido como Pro, está liberado para todos. |

---

## C. Bugs encontrados

| ID | Gravidade | Módulo | Descrição |
|---|---|---|---|
| BUG-01 | **Crítica** | Relatórios, Dashboard, Transações | Totais e listas ignoram lançamentos acima de 1.000 |
| BUG-02 | **Crítica** | Formulários com valor em texto | "1.500" é gravado como R$ 1,50 |
| BUG-03 | Alta | Relatórios | Dois totais de despesas diferentes na mesma tela |
| BUG-04 | Alta | Transações, Relatórios ("Tudo") | Totais somam parcelas futuras do cartão |
| BUG-05 | Alta | Saldos | Lançamento em conta com data futura muda o saldo de hoje |
| BUG-06 | Média | Transferência Pessoal/Empresa | Exclusão dos dois lados não é atômica |
| BUG-07 | Média | Assistente IA | Cota consumida mesmo quando a IA falha |
| BUG-08 | Média | Formulários | "R$ 50,00" é recusado |
| BUG-09 | Média | Acessibilidade | 16 campos sem rótulo acessível |
| BUG-10 | Baixa | Qualidade | 6 erros de lint em produção; ESLint analisa backups |
| BUG-11 | Baixa | WhatsApp | Mensagem marcada como processada antes de processar |

### BUG-01 — Totais e listas ignoram lançamentos acima de 1.000 (Crítica)
- **Passos:** usuário com mais de 1.000 lançamentos no escopo → Relatórios → período "Tudo".
- **Esperado:** despesas = soma real no banco.
- **Observado (executado):**
  - Banco: 1.121 lançamentos, despesas regulares de **R$ 69.157,77**.
  - App: **R$ 67.947,77**. Faltaram R$ 1.210,00 (121 lançamentos de R$ 10,00).
- **Causa:** o PostgREST do Supabase devolve no máximo 1.000 linhas por consulta, e o código busca tudo e soma em JavaScript, sem `.range()` nem agregação no banco.
- **Arquivos:**
  - `app/(dashboard)/relatorios/data/summary.ts` (consulta sem limite);
  - `.../category-expenses.ts`;
  - `lib/dashboard.ts:190` (todas as transações do escopo, para gráficos e análises);
  - `lib/transactions.ts` (`getTransactions`, lista sem paginação).
- **Correção:** somas e agrupamentos no banco (funções RPC ou views com `sum() group by`) e paginação por cursor na lista de transações. Teste de aceitação: com 5.000 lançamentos, os totais do app são iguais aos do SQL.

### BUG-02 — "1.500" gravado como R$ 1,50 (Crítica)
- **Passos:** Contas a pagar → Nova conta → Valor `1.500` → salvar.
- **Esperado:** R$ 1.500,00.
- **Observado:** `parseAmount("1.500")` retorna `1.5` (teste executado, FALHOU). A mesma regra existe em `parseMoney` (importação de extrato).
- **Campos afetados** (`inputMode="decimal"` + `parseAmount`):
  - `components/payables/payable-form.tsx`;
  - `components/taxes/das-list.tsx`;
  - `components/taxes/mei-settings-sheet.tsx`;
  - `components/business/scope-transfer-card.tsx` (pró-labore, retirada, aporte);
  - `components/business/goals-indicators.tsx`;
  - `components/business/pricing-calculator.tsx`;
  - `lib/services/schemas.ts` (todo valor em texto que passa pelos serviços).
- **Correção:**
  - um único componente de valor com máscara de moeda (centavos automáticos) em todos os formulários;
  - no parser, tratar `\d{1,3}(\.\d{3})+` sem vírgula como separador de milhar.
- **Aceitação:** os testes em `tests/audit/finance.test.ts` passam.

### BUG-03 — Dois totais de despesas na mesma tela (Alta)
- **Observado:** Relatórios "Tudo", com o mesmo conjunto de dados: o cartão "Despesas" mostra R$ 67.947,77 e o bloco de categorias mostra "Total R$ 68.127,77".
- **Causa:** BUG-01 aplicado a duas consultas diferentes (cada uma corta 1.000 linhas diferentes).
- **Correção:** resolver o BUG-01 e usar uma única fonte de totais por período.

### BUG-04 — Totais com parcelas futuras do cartão (Alta)
- **Observado em 12/11:** Transações mostrava despesas de R$ 7.012 e resultado de −R$ 812, enquanto o dashboard mostrava "Sobram R$ 3.771". A diferença eram as 11 parcelas futuras do Macbook (até 2027).
- **Arquivos:** `lib/transactions.ts` e os cartões de totais da página de Transações; `relatorios/data/summary.ts` no período "Tudo".
- **Correção:**
  - totais "até hoje" por padrão;
  - parcelas futuras num indicador separado ("R$ 4.583 a vencer");
  - na lista, um separador "Futuro".

### BUG-05 — Data futura altera o saldo de hoje (Alta, análise estática)
- **Causa:** `ff_create_transaction` soma o valor em `accounts.current_balance` na hora, independentemente de `transaction_date`. Uma despesa em conta com data do mês que vem já reduz o "Em contas" de hoje. Já a reconstrução do patrimônio (`net-worth.ts`) assume esse comportamento.
- **Correção:** decidir a regra do produto. A recomendada é saldo atual = apenas lançamentos até hoje, com projeções separadas. Depois, alinhar a função SQL e as telas.

### BUG-06 — Exclusão Pessoal/Empresa não atômica (Média, estática)
- **Causa:** `lib/services/transactions.ts:140` apaga os dois lados de uma transferência com dois RPCs em sequência. Se o segundo falhar, os saldos ficam desencontrados.
- **Correção:** uma função SQL `ff_delete_transfer_group(group)` numa única transação.

### BUG-07 — Cota da IA consumida em caso de falha (Média, estática)
- **Causa:** `app/api/ai/assistant/route.ts` chama `consumeAiQuota()` antes de chamar a IA, e não devolve a cota quando o provedor responde 502 ou dá timeout.
- **Correção:** consumir só após uma resposta válida, ou estornar no `catch`.

### BUG-08 — "R$ 50,00" é recusado (Média)
- **Causa:** `parseAmount` não remove o "R$" (teste FALHOU), e quem cola um valor copiado recebe erro de validação.
- **Correção:** a mesma do BUG-02.

### BUG-09 — Campos sem rótulo acessível (Média)
- **Medido a 390 px:**
  - Contas: 4 campos (nome, tipo, cor, saldo inicial);
  - Investimentos: 5 (dois campos de valor sem rótulo nem exemplo);
  - Transações: 3;
  - Categorias: 3;
  - Importar: 1.
- **Correção:** `<label htmlFor>` em todos. É o mesmo padrão já usado em login e cadastro.

### BUG-10 — Lint (Baixa)
- **Observado:** 10 erros e 12 avisos; 6 erros estão em código de produção (`react-hooks/set-state-in-effect`):
  - `components/landing/chat.tsx` (2);
  - `components/landing/day-timeline.tsx`;
  - `components/auth/use-next-param.ts`;
  - `components/pwa/install-guide.tsx`.
- Os outros 4 estão nos backups `.hallmark/`.
- **Correção:** ignorar `.hallmark/**` no `eslint.config.mjs` e corrigir os 6 erros.

### BUG-11 — Mensagem do WhatsApp marcada antes de processar (Baixa, estática)
- **Causa:** `lib/whatsapp/handler.ts:93` grava o `wamid` como processado antes de processar. Se a função cair no meio (timeout de 60 s), a Meta reenvia, mas a mensagem é ignorada. O usuário costuma receber "Ops, algo deu errado", então o impacto é baixo.
- **Correção:** guardar o estado (`processing`/`done`) e permitir reprocessar quando estiver em `processing` há mais de N segundos.

### Já corrigidos durante a sessão de redesign (antes da auditoria)
- Últimas transações mostravam parcelas futuras.
- Botões ilegíveis no modo escuro.
- Balão do Forge avisando fatura sem valor.
- Durações de animação lidas errado (`.13s`).
- Barras que não cresciam dentro de blocos revelados.

---

## Segurança (detalhe)

| ID | Gravidade | Achado | Evidência | Correção |
|---|---|---|---|---|
| SEC-01 | **Crítica** | Next.js 16.2.12 com CVEs de execução remota de código (Image Optimization com AVIF; servidores Windows) | `npm audit` executado: 2 críticas, 13 altas | Atualizar `next` para ≥ 16.4.6 e `eslint-config-next` junto; rodar o build e um teste rápido |
| SEC-02 | **Alta** | Sem recuperação de senha. `components/auth/forgot-password-form.tsx` existe, mas não está em nenhuma rota; não há `resetPasswordForEmail` | busca no código | Página `/esqueci-senha` e `/redefinir-senha` com Supabase Auth; link no login |
| SEC-03 | Média | `shadcn` (CLI) em `dependencies` puxa para produção o SDK MCP, hono, body-parser e outros com vulnerabilidades altas | `npm audit --omit=dev` | Mover `shadcn` para `devDependencies`; atualizar `zod` (alta, direta) |
| SEC-04 | Média | Exclusão de conta e dados só por e-mail (`/privacidade`); sem exportação de dados | código | Botão "Excluir minha conta" e "Baixar meus dados" (LGPD art. 18) |
| SEC-05 | Baixa | Limite de requisições do assistente fica em memória e não vale com várias instâncias (o próprio código avisa) | `app/api/ai/assistant/route.ts:30` | Limitador compartilhado (Upstash/Redis ou tabela) |
| SEC-06 | Baixa | O nome de uma variável no `.env.local` local começa com espaço | leitura só dos nomes | Remover o espaço; conferir as variáveis na Vercel |
| SEC-07 | Info | Módulo Empresa (MEI) liberado para o plano Grátis, embora a página de planos o venda como Pro | só `hasWhatsAppAccess` e a cota de IA são verificados no servidor | Decidir: bloquear no servidor ou tirar da lista do Pro |

**Verificado e aprovado**
- RLS ligado nas 25 tabelas públicas (consulta a `pg_class` no banco). As 8 tabelas sem política são internas e só o servidor acessa, o que bloqueia o cliente: correto.
- Usuário só lê o próprio plano e o próprio uso, sem permissão de escrita.
- Gatilho `ff_transactions_scope_guard` impede usar conta ou categoria de outro usuário; as funções de cartão conferem o dono.
- Webhook da Meta: HMAC SHA-256 com `timingSafeEqual`, deduplicação por `wamid`, limite de 30 mensagens por hora por número.
- Webhook do Stripe: assinatura verificada, idempotência por `event.id` e rollback quando o processamento falha.
- Cron com `Bearer CRON_SECRET`.
- Agente de IA: referências internas por usuário (o modelo nunca vê IDs reais), regra explícita contra injeção ("o texto do usuário é apenas dado"), ações destrutivas pedem confirmação.

---

## D. Melhorias de design (tela por tela)

| Tela | Problema | Mudança recomendada | Prioridade | Esforço |
|---|---|---|---|---|
| Transações (mobile) | 4 cartões de totais grandes empurram a lista para baixo (cerca de 2 telas de rolagem até o primeiro lançamento) | Uma faixa compacta ("Entradas · Saídas · Resultado" em uma linha, rolável) e a lista logo abaixo; filtros num botão | P1 | Baixo |
| Transações | Não dá para editar; a exclusão é um ícone de lixeira solto | Toque na linha abre um painel com edição completa, duplicar e excluir (com "Desfazer" no aviso) | P1 | Médio |
| Transações | Sem busca útil para histórico longo nem paginação | Busca no servidor, agrupamento por dia, rolagem infinita com cursor | P1 | Médio |
| Contas e Investimentos | Estilo anterior ao redesign: formulário solto, campos sem rótulo, sem estado vazio orientado | Mesmo padrão de formulário do login (rótulo, exemplo, valor com máscara) num painel lateral; lista em cartões com saldo e ação | P2 | Baixo |
| Cartões | Página longa com todas as faturas abertas; o "Adiantar pagamento" compete com o essencial | Cartão desenhado + linha do tempo de faturas (aberta, fechada, futuras recolhidas); um botão principal "Pagar fatura" | P2 | Médio |
| Dashboard | Bom. Ainda falta orçamento e previsão; o rótulo "Patrimônio" pode confundir (inclui investimentos) | Ver redesenho 3 (orçamento no topo); legenda "Contas + investimentos" ao passar o mouse | P2 | Médio |
| Relatórios | O seletor de período não vale para todos os blocos (velas e atividade têm período próprio) | Deixar claro qual bloco segue o filtro, ou unificar | P3 | Baixo |
| Gestão (MEI) | Avaliada só no código (não navegada no escopo Empresa) | Validar com um MEI real; DRE e ponto de equilíbrio precisam de texto explicativo | — | — |
| Geral | Alvos de toque < 24 px (links do caminho no topo, botões de ícone) | Mínimo de 44×44 px em telas de toque | P2 | Baixo |

### Redesenho 1 — Extrato (Transações), problema número 1 de uso
- **Por quê:** é a tela mais usada depois do dashboard e hoje é a mais fraca. Não edita, não pagina, totais enganosos e lista enterrada no celular.
- **Proposta:**
  1. Cabeçalho com o mês atual e setas ‹ ›. Resumo em uma linha: "Entrou R$ X · Saiu R$ Y · Sobrou R$ Z".
  2. Busca fixa e chips de filtro (Conta, Cartão, Categoria, Tipo).
  3. Lista agrupada por dia ("Hoje", "Ontem", "Ter, 10 nov") com o total do dia.
  4. Toque na linha abre a ficha da transação (editar, duplicar, mudar categoria, excluir).
  5. Parcelas futuras num grupo recolhido "A vencer".
- **Resultado esperado:** o primeiro lançamento visível sem rolar no celular, edição em 2 toques e totais que batem com o dashboard.

### Redesenho 2 — Formulário de lançamento único
- **Por quê:** hoje existem pelo menos 4 jeitos de digitar valor (número do navegador, texto com `parseAmount`, campo do importador, valor do bot) e o BUG-02 vem daí.
- **Proposta:** um `MoneyInput` com teclado numérico e centavos automáticos (digitar 1500 mostra R$ 15,00; 150000 mostra R$ 1.500,00), usado em todo o app. O formulário "Novo lançamento" começa pelo valor, como no WhatsApp; depois vêm descrição, categoria sugerida automaticamente e, por último, conta ou cartão.
- **Resultado esperado:** fim dos erros de valor e registro mais rápido.

### Redesenho 3 — Orçamento no topo do Dashboard
- **Por quê:** a frase "Sobram R$ X" diz o passado. O usuário quer saber o que pode gastar.
- **Proposta:** abaixo da barra de ritmo, até 3 orçamentos por categoria com barra (Delivery R$ 320/400, Mercado R$ 610/900) e o aviso "No ritmo atual, Delivery estoura dia 24".
- **Resultado esperado:** um motivo para abrir o app toda semana e um gancho natural para o Pro (alertas no WhatsApp).

---

## E. Melhorias de funcionalidades

**Melhorar o que existe**
1. Editar transação, no app e no WhatsApp ("na verdade foram 48"). Hoje não existe em lugar nenhum: `lib/services/transactions.ts` só tem criar e excluir; o agente não tem a ferramenta `editar_lancamento`.
2. Transferência entre contas próprias do mesmo escopo, sem contar como receita ou despesa. Hoje só existe Pessoal↔Empresa (`ff_scope_transfer`). O usuário acaba registrando uma saída e uma entrada, o que infla os totais.
3. Recuperação de senha (SEC-02).
4. Busca e paginação do extrato.
5. Totais "até hoje" separados de "a vencer" (BUG-04 e BUG-05).
6. Importação: avisar quando o lançamento parece duplicado em relação aos já existentes (reimportar o mesmo OFX). Não testei a reimportação ponta a ponta; vale um teste.

**Simplificar ou remover**
- 12 componentes de dashboard sem uso e 3 arquivos `lib` mortos:
  - `accounts-list`, `accounts-summary`, `cards-stack`, `dashboard-cards`, `due-soon-card`, `financial-insights`, `goals-card`, `hero-balance`, `month-flow`, `month-left`, `quick-actions-card`, `recent-transactions`;
  - `lib/whatsapp/parse.ts`, `lib/dashboard.backup.ts`, `lib/supabase.ts`.
  - Remover reduz a confusão para quem mantém o código.
- Raio-X e Relatórios têm sobreposição (padrões de gasto aparecem nos dois). Considerar fundir o Raio-X como uma aba de Relatórios.
- "Aportes, empréstimos e reembolsos" como quarto cartão em Transações: pouca gente entende. Mostrar só quando houver valor.

**Adicionar (por valor real)**

| Oportunidade | Problema | Público | Valor | Esforço | Custo operacional | Retenção | Riscos | Prioridade |
|---|---|---|---|---|---|---|---|---|
| Orçamento por categoria + alerta no WhatsApp | Usuário só descobre que estourou depois | Todos | Alto | Médio | Baixo (mensagens) | Alto | Excesso de alertas | P1 |
| Previsão de saldo no fim do mês | "Vou chegar no fim do mês?" | Todos | Alto | Médio | Nenhum | Alto | Previsão errada sem contas fixas | P2 |
| Detecção de assinaturas recorrentes | Assinaturas esquecidas | PF | Médio | Baixo | Nenhum | Médio | Falsos positivos | P2 |
| Resumo semanal no WhatsApp (domingo) | Usuário esquece o app | Todos | Alto | Baixo | Mensagem de template da Meta | Alto | Custo por mensagem e opt-in | P1 |
| Regras de categorização ("iFood → Delivery") | Recategorizar à mão | Intermediário | Médio | Baixo (já existe base no importador) | Nenhum | Médio | — | P2 |
| Divisão de despesas | Nicho | Casais e amigos | Baixo agora | Alto | — | Baixo | Escopo | P3 |
| Open Finance | Digitar tudo | Todos | Muito alto | Muito alto | Alto (agregador) | Alto | Regulação e custo | P3 |

**Ideias boas que não devem entrar agora:** Open Finance, divisão de despesas, investimentos com cotação automática, app nativo.

---

## F. Testes executados

| Teste | Ferramenta | Resultado | Evidência | Problema |
|---|---|---|---|---|
| Checagem de tipos | `tsc --noEmit` | **PASSOU** | 0 erros | — |
| Lint | `eslint .` | **FALHOU** | 10 erros, 12 avisos | BUG-10 |
| Testes existentes (cobrança) | `node --test tests/billing-static.test.mjs` | **PASSOU** | 6/6 | — |
| Testes financeiros novos | `node --experimental-strip-types --test tests/audit/finance.test.ts` | **FALHOU (11/14)** | 3 falhas em valores | BUG-02, BUG-08 |
| └ Datas de extrato, OFX, fatura, estorno, pagamento, centavos | idem | **PASSOU** | 11 casos | — |
| Build de produção | `next build` (Turbopack e webpack) | **BLOQUEADO** | A VM não acessa Google Fonts; o Turbopack não aceita `node_modules` por link | Rodar na Vercel ou localmente |
| Vulnerabilidades | `npm audit --omit=dev` | **FALHOU** | 2 críticas, 13 altas | SEC-01, SEC-03 |
| Dependências desatualizadas | `npm outdated` | Informativo | next 16.2.12 → 16.4.6 e outras | — |
| RLS no banco | SQL em `pg_class`/`pg_policies` | **PASSOU** | 0 tabelas sem RLS | — |
| Volume: totais com mais de 1.000 lançamentos | SQL + navegador | **FALHOU** | banco R$ 69.157,77 × app R$ 67.947,77 | BUG-01, BUG-03 |
| Rolagem horizontal a 320 e 390 px (16 telas) | Navegador (iframes) | **PASSOU** | 0 px em todas | — |
| Campos sem rótulo e alvos pequenos | Navegador (DOM) | **FALHOU** | 16 campos; 1 a 6 alvos menores que 24 px por tela | BUG-09 |
| Navegação e tempo de resposta | Navegador (Performance API) | Medido | 400–600 ms (dev) após a otimização | — |
| Modo escuro (dashboard, transações, cartões, relatórios) | Navegador | **PASSOU** após correções | capturas na sessão | Contraste de botões (corrigido) |
| WhatsApp: frases reais, áudio, desfazer, injeção | — | **BLOQUEADO** | Sem `ANTHROPIC_API_KEY` e sem número da Meta no ambiente | Revisão estática feita |
| Assistente IA ao vivo | — | **BLOQUEADO** | Sem chave da IA | — |
| Stripe em modo de teste | — | **NÃO EXECUTADO** | Cobrança desligada no ambiente | — |
| Lighthouse, LCP, INP, CLS | — | **NÃO EXECUTADO** | Só faz sentido no build de produção | — |
| E2E (Playwright) | — | **NÃO EXECUTADO** | Sem build de produção e sem conta de teste isolada | Recomendado no P1 |
| Regras do MEI (limite, DAS) contra fontes oficiais | — | **NÃO EXECUTADO** | Fora do tempo desta rodada | O bot já orienta conferir no gov.br |
| Importação OFX, CSV e XLSX ponta a ponta (arquivos reais, reimportação) | — | **NÃO EXECUTADO** | Só as funções de leitura foram testadas | — |

---

## G. Roadmap priorizado

### P0 — Antes de qualquer usuário pagante

| Tarefa | Impacto | Esforço | Dependências | Aceitação |
|---|---|---|---|---|
| Atualizar Next.js (SEC-01) e mover `shadcn` para dev (SEC-03) | Elimina RCE conhecida | Baixo | Build ok | `npm audit --omit=dev` sem críticas |
| Totais agregados no banco + paginação (BUG-01, BUG-03) | Números corretos para todos | Médio | — | Com 5.000 lançamentos, os totais do app são iguais aos do SQL; extrato carrega 50 por vez |
| `MoneyInput` único + parser corrigido (BUG-02, BUG-08) | Fim dos valores 1.000× menores | Baixo/Médio | — | `tests/audit/finance.test.ts` 14/14 |
| Recuperação de senha (SEC-02) | Usuário não perde o acesso | Baixo | E-mails do Supabase configurados | E-mail chega, o link redefine e o login funciona |
| Rodar o build de produção e corrigir o lint | Deploy confiável | Baixo | — | `next build` e `eslint` sem erros |

### P1 — Alta prioridade

| Tarefa | Impacto | Esforço | Aceitação |
|---|---|---|---|
| Editar transação (app + WhatsApp) | Remove a maior fricção diária | Médio | Editar valor, data, categoria e conta ajusta o saldo corretamente; "na verdade foram 48" funciona |
| Transferência entre contas próprias | Totais corretos e menos gambiarra | Médio | Transferir não altera receitas nem despesas; os saldos das duas contas batem |
| "Até hoje" × "a vencer" (BUG-04, BUG-05) | Confiança nos números | Médio | Dashboard, Transações e Relatórios mostram o mesmo resultado do mês |
| Exclusão atômica de transferência (BUG-06) e cota da IA (BUG-07) | Integridade | Baixo | Falha simulada não deixa saldo desencontrado nem consome cota |
| Testes E2E das jornadas (cadastro → conta → gasto → cartão parcelado → relatório) | Evita regressões | Médio | Pipeline verde em cada PR |
| Decidir o que é Pro (SEC-07) | Clareza comercial | Baixo | Bloqueio no servidor coerente com a página de planos |
| Resumo semanal no WhatsApp | Retenção | Baixo | Opt-in; enviado aos domingos |

### P2 — Melhorias importantes
- Redesenho do Extrato (seção D, redesenho 1).
- Orçamentos por categoria com alertas.
- Formulários de Contas e Investimentos no novo padrão, com rótulos acessíveis.
- Alvos de toque de 44 px.
- Exclusão de conta e exportação de dados (LGPD).
- Limitador compartilhado no assistente.
- Remover código morto (15 arquivos).

### P3 — Evoluções futuras
- Previsão de saldo.
- Detecção de assinaturas.
- Fundir o Raio-X em Relatórios.
- Open Finance.

---

## H. Top 20 melhorias (impacto ÷ custo)

1. Atualizar Next.js e mover `shadcn` para dev (segurança, horas).
2. `MoneyInput` único e parser de valor corrigido.
3. Totais agregados no banco.
4. Paginação e busca do extrato.
5. Recuperação de senha.
6. Editar transação no app.
7. Editar pelo WhatsApp ("na verdade foram 48").
8. Transferência entre contas próprias.
9. Separar "até hoje" de "a vencer" em todas as telas.
10. Corrigir o saldo com data futura (definir a regra e aplicar).
11. Build e lint no CI, com testes financeiros obrigatórios.
12. Testes E2E das 6 jornadas principais.
13. Redesenho do Extrato no celular (lista primeiro).
14. Orçamento por categoria + alerta no WhatsApp.
15. Resumo semanal no WhatsApp.
16. Decidir e bloquear no servidor o que é Pro.
17. Rótulos acessíveis e alvos de 44 px.
18. Exclusão de conta e exportação de dados (LGPD).
19. Exclusão atômica de transferências e cota da IA só em caso de sucesso.
20. Remover código morto e documentar a arquitetura no README (hoje é o padrão do create-next-app).

---

## I. Veredito

1. **Pronto para usuários reais?** Para um beta fechado e acompanhado, sim, depois dos P0. Para o público aberto, ainda não: números errados em histórico longo e valores 1.000× menores destroem a confiança de um app financeiro.
2. **Pronto para receber pagamentos?** Não. O integrador do Stripe está bem feito, mas há uma CVE crítica, não há recuperação de senha e o que é Pro não é coerente com o que o servidor bloqueia.
3. **Cinco maiores problemas:**
   - totais truncados em 1.000 lançamentos;
   - "1.500" gravado como 1,50;
   - Next.js com CVE crítica;
   - não dá para editar transação nem transferir entre contas;
   - sem recuperação de senha.
4. **Primeira melhoria visual:** o Extrato no celular, com a lista primeiro, resumo em uma linha e toque para editar.
5. **Primeira melhoria funcional:** editar transação (no app e no WhatsApp).
6. **Remover ou simplificar:** os 15 arquivos mortos, o quarto cartão de "Aportes" quando estiver zerado, e a sobreposição entre Raio-X e Relatórios.
7. **O maior diferencial:** o WhatsApp como interface completa, que registra, corrige, consulta e alerta sem abrir o app, com números sempre vindos do banco (o agente já foi desenhado assim).
8. **Antes de escalar:** agregação no banco, paginação, testes E2E e financeiros no CI, limitador compartilhado e monitoramento de erros (não encontrei Sentry nem equivalente).

---

### O que não foi verificado (limitações)
- WhatsApp e IA ao vivo (sem credenciais), Stripe em modo de teste, build de produção (bloqueado pela rede da VM), Lighthouse, Playwright, regras fiscais do MEI contra fontes oficiais, escopo Empresa navegado no navegador e importação de arquivos reais.
- Notas marcadas como "estática" vêm só da leitura do código.
