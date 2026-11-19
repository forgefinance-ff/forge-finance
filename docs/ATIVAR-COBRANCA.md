# Forge Pessoal e Forge MEI: como ativar a cobrança (Stripe)

Tudo já está no código, mas a cobrança fica **DESLIGADA** até você colocar
`BILLING_ENABLED=true` na Vercel. Enquanto estiver desligada, ninguém consegue
assinar e o WhatsApp e o modo Empresa funcionam para todos.

---

## 1. Aplicar o pacote

1. Substitua os arquivos do projeto pelos do ZIP e suba para o GitHub.
2. No Supabase, abra **SQL Editor** e rode o arquivo
   `supabase/migrations/20261118110000_planos_pessoal_mei.sql`.
   Ele cria o **Forge Pessoal**, transforma o antigo Forge Pro no **Forge MEI**
   e atualiza a receita do painel admin. Pode rodar mais de uma vez sem problema.

## 2. Stripe em MODO TESTE (faça já, sem cobrar ninguém)

1. Crie a conta em **stripe.com/br** com seu CPF (deixe o CNPJ vazio).
2. Confira se o botão **"Modo de teste"** está ligado no painel.
3. **Produtos e preços**: Catálogo de produtos → Adicionar produto
   - Produto `Forge Pessoal`: **R$ 19,90** mensal e **R$ 199,00** anual
   - Produto `Forge MEI`: **R$ 29,90** mensal e **R$ 299,00** anual
   - Todos recorrentes. Copie o ID de cada preço (começa com `price_...`).
4. **Portal do cliente**: Configurações → Faturamento → Portal do cliente.
   Ative: cancelar assinatura (no fim do período), atualizar forma de
   pagamento, ver histórico de faturas e **trocar de plano** entre o Forge
   Pessoal e o Forge MEI (é por aqui que o assinante muda de plano). Salve.
5. **Webhook**: Desenvolvedores → Webhooks → Adicionar endpoint
   - URL: `https://SEU-SITE/api/billing/webhook`
   - Eventos:
     `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `customer.subscription.paused`, `customer.subscription.resumed`,
     `invoice.paid`, `invoice.payment_failed`
   - Copie o **Segredo de assinatura** (começa com `whsec_...`).

### Visual do pagamento (dentro do site)
O formulário do cartão aparece na página `/assinar` do Forge. Para ele ficar
com a cara do Forge: Stripe → Configurações → **Identidade visual (Branding)**
→ ícone (`icon-f.png`), cor da marca `#7C3AED`, botões arredondados. Em
**Dados públicos**, use o nome "Forge Finance".

## 3. Variáveis na Vercel

Projeto → Settings → Environment Variables:

| Nome | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | chave secreta (`sk_test_...` no teste) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | chave publicável (`pk_test_...` no teste) — usada no pagamento dentro do site |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` do passo 2.5 |
| `STRIPE_PRICE_PESSOAL_MONTHLY` | `price_...` do Pessoal mensal |
| `STRIPE_PRICE_PESSOAL_YEARLY` | `price_...` do Pessoal anual |
| `STRIPE_PRICE_MEI_MONTHLY` | `price_...` do MEI mensal |
| `STRIPE_PRICE_MEI_YEARLY` | `price_...` do MEI anual |
| `BILLING_ENABLED` | `false` (deixe assim até o fim do teste) |

**Nunca** coloque a chave secreta em variável que comece com `NEXT_PUBLIC_`.

Para testar o fluxo inteiro antes de lançar, coloque `BILLING_ENABLED=true`
**só no ambiente Preview** e use um link de prévia da Vercel.

### Cartões de teste
- Aprovado: `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.
- Recusado: `4000 0000 0000 0002`.

## 4. Lançar de verdade (depois do teste)

1. No Stripe, desligue o modo teste e **ative a conta** (dados pessoais e banco).
2. Recrie no modo produção: os 2 produtos, os 4 preços, o portal e o webhook.
3. Na Vercel, troque as 7 variáveis do Stripe pelas de produção.
4. Coloque `BILLING_ENABLED=true` em Production.
5. Assine o **Vercel Pro** (o plano grátis não permite uso comercial).

### Preço de fundador (opcional)
Stripe → Cupons → crie um cupom (ex.: R$5 de desconto para sempre) e um
**código promocional** (ex.: `FUNDADOR`), limitado a 100 usos. O checkout já
aceita códigos promocionais.

### Garantia de 7 dias
Se alguém pedir o dinheiro de volta em até 7 dias: Stripe → Pagamentos →
abra o pagamento → **Reembolsar**, e cancele a assinatura do cliente.

---

## O que mudou no WhatsApp

- **Lançamento claro é gravado na hora**, numa mensagem só, com o botão
  **↩️ Desfazer** (vale 24h). O usuário também pode escrever "desfazer".
- **Pede confirmação** quando: a IA tem dúvida, não achou categoria, é compra
  parcelada, ou é exclusão/edição.
- Isso corta pela metade as mensagens do bot (a Meta cobra por mensagem).
- Com a cobrança ligada, **só quem assina o Forge Pessoal ou o Forge MEI usa o
  WhatsApp**. Quem não assina recebe o aviso com o link de assinatura no máximo
  1 vez por dia. No Forge Pessoal, o bot não mexe na parte da Empresa.

## Transcrição de áudio

Agora usa `gpt-4o-mini-transcribe` (metade do preço). Para voltar ao modelo
antigo, crie na Vercel `WHISPER_MODEL=whisper-1`.

---

## Backup diário grátis do Supabase

O arquivo `.github/workflows/backup-supabase.yml` faz um backup por dia,
**criptografado**, guardado por 30 dias na aba Actions do GitHub.

1. Supabase → **Connect** → copie a string do **Session pooler**
   (a "Direct connection" não funciona no GitHub) e troque `[YOUR-PASSWORD]`
   pela senha do banco.
2. GitHub → repositório → Settings → Secrets and variables → Actions:
   - `SUPABASE_DB_URL` = a string do passo 1
   - `BACKUP_PASSPHRASE` = uma senha longa inventada por você.
     **Guarde num lugar seguro: sem ela o backup não abre.**
3. Actions → "Backup do Supabase" → **Run workflow** para testar na hora.

### Restaurar um backup
Baixe o arquivo em Actions → (execução) → Artifacts, e no seu computador:

```bash
gpg --decrypt forge-AAAA-MM-DD.dump.gpg > forge.dump
pg_restore --clean --if-exists --no-owner -d "STRING_DO_SUPABASE" forge.dump
```

Restaurar **apaga e recria** os dados. Na dúvida, me chame antes.
