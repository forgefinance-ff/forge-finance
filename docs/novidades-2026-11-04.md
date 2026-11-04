# Novidades — 04/11/2026

## 1. Aportes, empréstimos e reembolsos
- Toda categoria agora tem uma **natureza**: Receita/Despesa, Aporte, Empréstimo ou Reembolso.
- O app cria sozinho as categorias **Aportes**, **Empréstimos** e **Reembolsos**, cada uma com entrada e saída (no Pessoal; na Empresa depois que ela tiver categorias).
- Essas movimentações mexem no saldo das contas, mas **não entram** em receitas, despesas, gráficos, relatórios, análises do dashboard nem no faturamento do MEI.
- Em Transações, o card "Aportes, empréstimos e reembolsos" mostra o saldo dessas movimentações à parte.

## 2. Mais categorias da Empresa
- O padrão da Empresa ganhou: Comissões, Rendimentos financeiros, Matéria-prima e insumos, Embalagens, Anúncios online, Contabilidade, Taxas bancárias e maquininha, Salários e freelancers, Aluguel, Água, luz e internet, Telefone, Frete e entregas, Transporte, Alimentação, Manutenção e Cursos e capacitação.
- Quem já usa a Empresa tem o botão **Adicionar sugeridas** em Categorias (só cria as que faltam).

## 3. Extrato de entradas e extrato de saídas
- Em Transações: abas **Todas / Extrato de entradas / Extrato de saídas**, com o total por categoria.
- Categorias com o mesmo nome (ex.: "Outros") nunca se misturam: entrada e saída são somadas separadas.
- A tela de Categorias separa Entradas, Saídas e Aportes/Empréstimos/Reembolsos.

## 4. Importar extrato (no lugar da sincronização bancária)
- Nova tela **Importar extrato** (menu lateral): OFX, CSV ou Excel (.xlsx).
- Detecta as colunas, sugere a categoria, marca possíveis duplicados (mesma data, valor e tipo já na conta) e só importa depois da revisão.
- Fatura de cartão com compras positivas: marque "Inverter sinais".
- O .xls antigo não é lido: salve como .xlsx ou .csv.

## 5. Assistente IA em aba própria
- Nova tela **Assistente IA**: conversa com respostas completas, usando 12 meses de histórico por categoria, contas, investimentos, vencimentos e o limite do MEI.
- Perguntas prontas ao lado (diferentes para Pessoal e Empresa).
- O dashboard ganhou atalhos de perguntas padrão e o link para o Assistente.

## Como aplicar
1. No Supabase (SQL Editor), rode `supabase/migrations/20261104090000_movement_kinds.sql`.
   **Rode antes de publicar o código**: os relatórios passam a filtrar pela coluna `kind`.
2. Publique o código na Vercel normalmente.
