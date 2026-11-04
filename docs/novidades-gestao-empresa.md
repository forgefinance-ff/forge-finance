# Gestão da empresa — novidades

Nova tela **Gestão** (menu lateral, escopo Empresa), logo depois do Dashboard.

1. **Fluxo de caixa projetado (30/60/90 dias)**: saldo das contas da empresa + contas a receber − contas a pagar, dia a dia. Atrasadas entram hoje; contas mensais são repetidas nos próximos meses. Avisa o dia em que o caixa fica negativo.
2. **DRE simplificada (6 meses)**: faturamento − impostos − custos variáveis = margem de contribuição − custos fixos − pró-labore = lucro, com percentuais. Retiradas, aportes e empréstimos aparecem à parte.
   - Cada categoria de despesa da Empresa tem uma **classe de custo** (variável, fixo, imposto, pró-labore), editável em Categorias. As categorias padrão já vêm classificadas.
3. **Ponto de equilíbrio** (quanto faturar para não ter prejuízo, e quanto falta no mês) e **calculadora de preço**.
4. **Seu dinheiro x dinheiro da empresa**: registra pró-labore, retirada de lucros ou aporte de uma vez (sai de uma conta, entra na outra). Apagar um lado apaga os dois. Alertas quando você tira mais do que a empresa lucrou.
5. **Inadimplência e clientes**: total em atraso, clientes devendo, atraso médio, quem mais deve e quem mais compra.
   - **Lembrete diário pelo WhatsApp** (8h): atrasadas, vencendo hoje e amanhã.
6. **Metas e indicadores**: meta de faturamento e de margem, número de vendas, ticket médio e comparação com o mês anterior e o mesmo mês do ano passado.

O Assistente IA também passou a ver esses números no escopo Empresa.

## Como aplicar
1. Supabase → SQL Editor: rode `supabase/migrations/20261105090000_business_management.sql` (depois da migração de 04/11).
2. Vercel → Settings → Environment Variables:
   - `CRON_SECRET`: um texto aleatório longo (protege o lembrete diário).
   - `SUPABASE_SERVICE_ROLE_KEY`: já existe se o bot do WhatsApp funciona.
   - Opcional: `WHATSAPP_REMINDER_TEMPLATE` com o nome de um modelo aprovado na Meta (categoria Utilidade, 1 variável no corpo). Sem ele, o lembrete só chega se você falou com o bot nas últimas 24 h.
3. Publique o código. O `vercel.json` agenda o lembrete às 11:00 UTC (08:00 de Brasília).
