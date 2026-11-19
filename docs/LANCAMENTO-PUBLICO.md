# Checklist de lançamento do Forge Finance

Produção: Supabase `ixgdxgfhpycaadoogsyz`, site `https://www.forgefinance.com.br`.
Passo a passo do Stripe: `docs/ATIVAR-COBRANCA.md`.
Testes técnicos (senha, WhatsApp, Sentry e CI): `docs/LANCAMENTO.md`.

## 1. Decisões dos sócios (antes de tudo)
- [ ] Preço do Forge MEI: R$ 29,90 (o brief do Thiago previa R$ 39,90, com fundador a R$ 29,90).
- [x] Quem vende: Thiago Paes da Costa Canto, pessoa física.
- [ ] A conta do Stripe precisa estar no nome do Thiago.
- [ ] O que acontece com quem já passou dos 30 dias de teste (veja o item 5).

## 2. Jurídico
- [x] Página `/termos` criada e `/privacidade` atualizada.
- [ ] Vercel: preencher `NEXT_PUBLIC_SELLER_CPF` e `NEXT_PUBLIC_SELLER_ADDRESS` com os dados do Thiago (aparecem no rodapé e nos Termos).
- [ ] Pedir para um advogado revisar `/termos` e `/privacidade`.

## 3. Banco de produção
Rodar no SQL Editor, nesta ordem, as que ainda não estiverem aplicadas:
- [ ] `20261115120000_whatsapp_outbound`
- [ ] `20261118090000_agenda`
- [ ] `20261118100000_security_fixes`
- [ ] `20261118110000_planos_pessoal_mei` (antes de publicar o código novo, senão o `/admin` dá erro)
- [ ] `20261118120000_usage_costs` (liga a aba Custos do `/admin`)

## 4. Serviços
- [ ] Supabase Pro e Vercel Pro (o plano grátis da Vercel não permite uso comercial).
- [ ] SMTP próprio para confirmação de e-mail e recuperação de senha.
- [ ] Vercel: `ADMIN_EMAILS` com os e-mails dos 3 sócios.
- [ ] Vercel: `NEXT_PUBLIC_APP_URL=https://www.forgefinance.com.br`.
- [ ] Vercel: conferir `WHATSAPP_MONTHLY_TEMPLATE`, `NEXT_PUBLIC_GOOGLE_AUTH` e `CRON_SECRET`.
- [ ] Meta: empresa verificada e modelos de mensagem aprovados.
- [ ] Sentry ligado e backup diário do Supabase testado.

## 5. Cobrança
- [ ] Testar no modo teste do Stripe: assinar os 2 planos, trocar de Pessoal para MEI, cancelar e reembolsar.
- [ ] Criar no modo produção os 2 produtos, os 4 preços, o portal e o webhook.
- [ ] Trocar as 7 variáveis do Stripe na Vercel.
- [ ] **Atenção antes de ligar:** o teste grátis conta 30 dias desde o cadastro. Ao ligar a cobrança, quem se cadastrou há mais de 30 dias perde na hora o WhatsApp e o modo Empresa. Avise antes ou estenda o teste dessas contas.
- [ ] Colocar `BILLING_ENABLED=true` em Production.

## 6. Dia do lançamento
- [ ] Criar uma conta nova e fazer o caminho completo: cadastro, WhatsApp, primeiro gasto e assinatura.
- [ ] Fazer uma compra real de um sócio e reembolsar.
- [ ] Conferir se a assinatura aparece no `/admin`.
- [ ] Acompanhar o Sentry e o suporte nas primeiras 48 horas.
