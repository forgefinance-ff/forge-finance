# Brief para o Claude Code: crescimento e redução de custos (18/11/2026)

Thiago (sócio) pediu para passar este trabalho ao Claude Code. O plano completo, escrito com os sócios,
está em https://claude.ai/artifact/B6uWQcBwHu248KQJ5JgtE1. A meta é chegar a 420–600 pagantes,
com o foco do produto no **MEI**.

## Antes de começar: fatos que o CLAUDE.md ainda não diz

- **Produção usa o Supabase `ixgdxgfhpycaadoogsyz`** ("forgefinance-ff's Project"), não o `niuaapeweqcbxpwfnnnj`
  citado no CLAUDE.md. Corrija o CLAUDE.md.
- A migração `20261117090000_trial_monthly_summary` já foi aplicada na produção em 17/11.
- Domínio oficial: `https://www.forgefinance.com.br` (o sem www redireciona). Site URL do Supabase já aponta para ele.
- O login com Google funciona em produção. O cliente OAuth fica no Google Cloud do Thiago (projeto "Forge Finance").
- O bot do WhatsApp parou em 17/11 por saldo devedor na Meta (erro 131042). Já foi resolvido.
  O contador `whatsapp_outbound_daily` só registra o envio aceito, não a falha que a Meta avisa depois pelo webhook de status.
- **Publicação:** o Thiago quer que o Claude publique sozinho, sem deixar o passo para ele:
  merge na `main`, deploy na Vercel e migrações no Supabase de produção.
  Isso vale só para mudanças seguras, testadas e reversíveis.
  Cobrança real, apagar dados e qualquer coisa irreversível: confirmar com ele antes.

## Tarefas, em ordem

### 1. Medir o custo real (primeiro, porque as outras decisões dependem disso)
- Guardar `usage` (tokens de entrada, saída, cache lido e cache escrito) de cada chamada à Anthropic,
  no bot (`lib/whatsapp/agent/agent.ts`) e no assistente (`app/api/ai/assistant/route.ts`), por usuário e por dia.
- Registrar as falhas de entrega que a Meta avisa pelo webhook de status (ex.: 131042) em `whatsapp_outbound_daily.failed`.
- No `/admin`, trocar a estimativa de custo de IA pelo valor real (Haiku 5.5: US$ 0,10 por milhão de tokens de entrada,
  US$ 0,50 de saída e US$ 0,01 de leitura de cache) e mostrar o custo médio por usuário.
- Pronto quando: o `/admin` mostra o custo de IA e de WhatsApp do mês, com o custo por usuário, a partir de dados gravados.

### 2. Cortar o custo da IA
- Pôr um segundo `cache_control` depois do bloco "Contexto do usuário" em `callClaude`, para as rodadas e as mensagens
  seguintes da mesma conversa lerem o contexto do cache.
- Criar um atalho sem IA para lançamentos simples e claros ("gastei 45 no mercado", "recebi 200 do João").
  Na dúvida, o pedido vai para o agente.
- Pronto quando: o custo médio por mensagem (medido no item 1) cair e os testes do bot continuarem passando.

### 3. Planos Pessoal e MEI, com limite de mensagens
- Pessoal: R$ 19,90 por mês ou R$ 199 por ano, até 150 mensagens por mês no WhatsApp.
- MEI: R$ 39,90 por mês ou R$ 399 por ano, com Pessoal + Empresa (contas a pagar e receber, clientes, cobranças, DAS),
  até 400 mensagens por mês.
- O teste grátis de 30 dias continua com tudo liberado.
- Oferta de fundador: os 50 primeiros MEIs pagam R$ 29,90 para sempre (cupom da Stripe).
- Contar as mensagens recebidas em `usage_records` (recurso `whatsapp_messages`).
  Quem passar do limite recebe um aviso, uma vez por mês, com a opção de mudar de plano, e o bot para de chamar a IA até o mês virar.
- **Perguntar ao Thiago antes de implementar:**
  - o que acontece com quem já usa a parte Empresa no plano Pro atual;
  - se o plano `pro` existente vira o Pessoal.

### 4. Programa de parceiros (contadores)
- Tabelas `partners` (nome, contato, código, chave Pix, percentual, que começa em 25%) e `partner_referrals`
  (usuário, parceiro, data).
- O link `/p/<codigo>` grava um cookie, e o cadastro registra a indicação.
- Gravar o parceiro no metadata do cliente na Stripe.
- Comissão: no webhook `invoice.paid`, lançar a comissão do mês (percentual × valor pago) numa tabela `partner_commissions`.
- Página `/parceiro` (login do parceiro) com clientes ativos, comissão do mês e histórico.
- Página `/admin/parceiros` para cadastrar parceiros e marcar a comissão como paga (o Pix é feito por fora).
- Formato revenda (opcional depois): o parceiro paga R$ 29,90 por cliente.

### 5. Relatório para o contador
- Na área Empresa: exportar em PDF e CSV as receitas e despesas do mês e do ano.
- Incluir o total de receita bruta do ano, que é o número da declaração anual do MEI, separado por categoria.
- Botão "Enviar para meu contador" (por e-mail, pelo Resend já configurado).
- Não afirmar valores fiscais oficiais. Manter o aviso de que o Forge não substitui um contador.

### 6. Ligar a cobrança real (último, depende do Thiago)
- Ainda está em modo teste (`BILLING_ENABLED=false`, preços da Stripe de teste).
- Precisa de decisão do Thiago sobre CNPJ e conta da Stripe. Nada de cobrança real sem o ok dele.
- Checklist quando liberar:
  - chaves da Stripe em produção;
  - preços dos planos Pessoal, MEI e anual;
  - webhook de produção;
  - `BILLING_ENABLED=true`;
  - um pagamento de teste no modo teste antes de virar a chave.

## Lembretes de custo da infraestrutura
- O Vercel Hobby não permite uso comercial: antes de cobrar, é preciso o plano Pro (US$ 20 por mês, 1 assento).
- O Supabase de produção precisa do plano Pro (US$ 25 por mês) antes de crescer.
- Meta: 1.000 respostas grátis por mês. As mensagens que o bot inicia (modelos) têm limite de 250 contatos por dia
  enquanto a empresa não for verificada. Acima de ~250 usuários, os resumos automáticos precisam sair espalhados.
