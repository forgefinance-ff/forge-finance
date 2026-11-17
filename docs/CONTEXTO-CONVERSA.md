# Contexto da conversa com o Claude (até 15/11/2026)

Resumo de tudo o que foi feito no Forge Finance numa conversa longa no app do Claude, para continuar no Claude Code sem perder nada.

## 1. Linha do tempo do que foi feito

1. **Auditoria completa:** está em `audit/RELATORIO.md` e `audit/STATUS-POS-CORRECOES.md`.
   - Totais errados com mais de 1000 lançamentos.
   - "1.500" virando R$ 1,50.
   - Next com falha crítica de segurança.
   - Faltava recuperação de senha.
   - E outros problemas.
2. **Correções em 4 fases:**
   - Totais calculados no banco; extrato novo; editar transação e transferir entre contas.
   - Orçamentos; LGPD (exportar dados e excluir conta); resumo semanal no WhatsApp.
   - Limite de uso (rate limit) e cota de IA; páginas de erro; testes e CI.
   - Limpeza de código morto.
3. **Correções do amigo (commit `faf7376`):** ajustes de celular, marca (wordmark) e campos de 16 px.
4. **Balão de suporte** no estilo iMessage, com botão roxo.
   - Primeiro o robô responde com as respostas rápidas (`components/support/support-answers.ts`).
   - Depois de toda resposta aparece **"Não resolveu? Falar com a equipe"**.
5. **Favicon** com a logo do Forge.
6. **Painel admin** (`/admin`, só para os e-mails em `ADMIN_EMAILS`; para os outros dá 404):
   - Visão geral com gráficos: funil, cadastros, planos, receita, custos e alertas.
   - Usuários: filtros, liberar/estender/retirar Pro, zerar a cota de IA, desconectar o WhatsApp.
   - Suporte: caixa de entrada do chat com a equipe; a resposta chega no balão do usuário.
   - Histórico: tabela `admin_actions`, com quem fez cada ação e por quê.
   - Conteúdo financeiro dos usuários **não** aparece no painel, por causa da LGPD.
7. **Teste grátis de 30 dias** a partir do cadastro (`user_entitlements.trial_ends_at`).
   - Só faz diferença quando a cobrança estiver ligada.
8. **Resumo do mês** (`/resumo`):
   - O que mostra: sobrou/faltou, entrou/saiu, comparação com o mês anterior, dias com movimento, gráfico de 6 meses, onde mais gastou, orçamentos e lucro do MEI.
   - Aviso no app no último dia do mês (ou nos 3 primeiros do mês seguinte).
   - No WhatsApp sai às 19h do último dia, pelo cron `/api/cron/monthly` (variável `WHATSAPP_MONTHLY_TEMPLATE`).
   - Convite para assinar no fim do teste.
9. **Calendário novo** com react-day-picker v9 (`components/ui/calendar.tsx`, `date-picker.tsx`, `calendar-range-select.tsx`).
   - Usado na data da transação e no período personalizado dos Relatórios.
   - Ainda falta trocar os outros campos de data: contas a pagar, metas, DAS e transferência entre escopos.
10. **Telas de login, cadastro e senha** no estilo do componente sign-in (`components/ui/sign-in.tsx`, `components/auth/*`).
    - Painel roxo com a conversa no WhatsApp e cartões de recursos.
    - **Sem depoimentos inventados.** Só entram depoimentos reais quando houver clientes.
11. **Login com Google:**
    - Google Cloud: projeto "Forge Finance", cliente "Forge Finance Web".
    - Supabase: provedor ligado; Redirect URL `http://localhost:3000/**`.
    - App: `NEXT_PUBLIC_GOOGLE_AUTH=true`.
    - O app do Google está em **"Testando"**: só os usuários de teste cadastrados entram.
    - Para publicar, precisa de domínio com página inicial, política de privacidade e termos.

## 2. Decisões de produto e negócio
- **Foco:** MEI de serviço. O pessoal é bônus. O concorrente a vencer é o contador e o Conta Azul, não os bots de R$ 9,90.
- **Preço do Pro:** R$ 19,90 por mês ou R$ 199 por ano.
  - Oferta de fundador sugerida: R$ 9,90 por mês para sempre, ou R$ 99 por ano, para os 50 primeiros.
- **Pesquisa de mercado e plano de lançamento** (documento): https://claude.ai/artifact/QrPXQDPixmftF4szztbaJU
- **Primeiro cliente:** vender à mão. Recebe por Pix ou link do Mercado Pago e libera o Pro no `/admin/usuarios` ("Liberar Pro", motivo "fundador"). Cada sócio manda 15 mensagens individuais para MEIs da rede.

## 3. Pendências (por prioridade)
1. **URGENTE: upgrade do Supabase.** O aviso diz que o projeto será restringido a partir de **16/11/2026** por cota.
2. **Publicar o pacote de `entrega/` na Vercel:**
   - Rodar as 5 migrations, se a produção usar outro projeto.
   - Configurar `ADMIN_EMAILS` com os 3 e-mails dos sócios (faltam os e-mails de 2 deles).
3. **SMTP próprio** (Resend ou Brevo). Sem ele, a confirmação de e-mail e a recuperação de senha falham com volume.
4. **Stripe em modo de teste:** assinar, cancelar e reembolsar antes de ligar `BILLING_ENABLED`.
5. **Landing focada em MEI:**
   - Headline: "O financeiro do seu MEI, direto no WhatsApp".
   - Seção "Feito para MEI".
   - Preço comparado ao contador.
6. **App abrindo no modo Empresa**, com o trial liberando o Empresa (hoje o Empresa é só do Pro).
7. **Termos de uso e política de privacidade**, incluindo o que a equipe vê no admin e no suporte.
8. **Aviso para a equipe** quando chegar mensagem no suporte (WhatsApp ou e-mail).
9. **Admin:** mostrar "Teste (X dias)" para quem está no trial. Hoje aparece como Free.
10. **Domínio próprio:** depois, publicar o app do Google e configurar o domínio no Supabase e no Google.

## 4. Detalhes técnicos úteis
- **Supabase:** as migrations foram aplicadas pelo SQL Editor, colando o arquivo e clicando em Run.
  - O aviso "destructive operation" aparece em `drop trigger` e `update` idempotentes.
- **`react-day-picker`:** foi copiado direto para o `node_modules` do Windows. Um `npm install` normal já resolve.
- **Git na pasta sincronizada:** às vezes sobram arquivos `.lock` em `.git`. Se um comando reclamar de "File exists", mova o `.lock` antigo para outro nome dentro de `.git` (não apague às cegas).
- **Testes:** `tests/unit/*.test.ts` rodam com `node --test` (sem alias `@/`). Funções puras ficam em arquivos sem imports com alias, por exemplo `lib/monthly-summary-core.ts`, `lib/billing/manual-access.ts` e `lib/admin/emails.ts`.
