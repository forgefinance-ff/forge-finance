# Raio-X da rotina — novidades

Nova tela **Raio-X** (menu lateral → Metas e relatórios → Raio-X). Funciona no **Pessoal** e na **Empresa**: mostra os dados do escopo ativo.

1. **Indicadores**: dia da semana mais caro, quanto os hábitos repetidos custam por mês/ano, categoria que mais subiu e
   - no Pessoal: **dias sem gastar** no mês (com sequência e recorde);
   - na Empresa: saída média por dia útil.
2. **Calendário de gastos (13 semanas)**: cada dia é um quadrado mais forte quanto mais saiu. Ponto verde = entrada; contorno amarelo = vencimento (contas a pagar, fatura de cartão, DAS). Mostra os dias do mês que concentram as saídas.
3. **Quanto sai em cada dia da semana**: média por dia, com comparação dias úteis × fim de semana.
4. **Hábitos que se repetem**: agrupa gastos com o mesmo nome (tira "Pix enviado ·", "Pagamento realizado ·", "LTDA" etc.) nos últimos 90 dias. Marca "fixo todo mês", "subindo" e "pequeno e frequente". Ignora pagamento de fatura e Pix para você mesmo.
5. **Para onde vai cada R$ 100 (30 dias)**: 100 blocos coloridos.
   - Pessoal: essencial × estilo de vida (novo campo em Categorias), dívidas/empréstimos, aportes e o que sobrou.
   - Empresa: usa a classe de custo que já existe (variável, fixo, imposto, pró-labore) e o lucro.
6. **Agenda financeira da semana**: contas a pagar e receber, faturas do cartão e DAS dos próximos 7 dias (atrasadas entram hoje), com o saldo previsto no fim de cada dia.
7. **O que mudou**: categorias nos últimos 30 dias × média dos 3 meses anteriores, e o ritmo do mês (projeção × média).

Os números vão até a data do último lançamento (extratos importados chegam com atraso); a tela avisa quando isso acontece.
O horário do registro não é usado de propósito: extrato importado não tem hora, então um mapa por horário mostraria um padrão falso.

## Como aplicar
1. Supabase → SQL Editor: rode `supabase/migrations/20261110090000_spending_groups.sql` (pode rodar mais de uma vez). Ele cria o grupo "essencial / estilo de vida" e já classifica as categorias pessoais padrão.
   - Se publicar o código antes de rodar o SQL, a tela funciona do mesmo jeito; só o "Para onde vai cada R$ 100" do Pessoal mostra tudo como "Sem grupo".
2. Publique o código (não há variável de ambiente nova).
