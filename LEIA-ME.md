# Forge Finance: registro de gastos pelo WhatsApp

Fluxo: você manda texto/áudio, o Whisper transcreve, o Claude Haiku extrai
valor/categoria/conta/data, o bot pede confirmação e só então grava no Supabase.

## 1. Aplicar os arquivos
Extraia este ZIP na RAIZ do projeto (C:\forge-finance-v2) e aceite substituir
`components/app-sidebar.tsx` (só ganhou o item "WhatsApp").

Se ainda não tiver o pacote: `npm i @supabase/supabase-js`

## 2. Banco (Supabase)
Abra o SQL Editor, cole `supabase/migrations/20261101_whatsapp.sql` e rode.

## 3. Variáveis de ambiente (.env.local e Vercel)
```
SUPABASE_SERVICE_ROLE_KEY=...        # Supabase > Settings > API (NUNCA expor no navegador)
OPENAI_API_KEY=...                   # transcrição (Whisper)
ANTHROPIC_API_KEY=...                # você já tem
WHATSAPP_VERIFY_TOKEN=...            # invente uma frase longa
WHATSAPP_ACCESS_TOKEN=...            # token da Meta (permanente, ver abaixo)
WHATSAPP_PHONE_NUMBER_ID=...         # ID do número, painel WhatsApp > API Setup
META_APP_SECRET=...                  # Meta app > Settings > Basic > App Secret
NEXT_PUBLIC_WHATSAPP_NUMBER=55...    # opcional: número do bot, só dígitos (botão "Abrir no WhatsApp")
# opcionais: WHATSAPP_AI_MODEL (padrão claude-haiku-5-5), WHISPER_MODEL (padrão whisper-1)
```

## 4. Meta (WhatsApp Cloud API)
1. developers.facebook.com > Create App > tipo Business > adicionar produto WhatsApp.
2. WhatsApp > API Setup: use o número de teste e adicione o SEU número em
   "To" (só números cadastrados recebem mensagens no modo de teste).
3. Token permanente: Business Settings > System Users > criar usuário Admin >
   Generate token com permissões whatsapp_business_messaging e
   whatsapp_business_management. (O token de 24h do painel serve só para testar.)
4. WhatsApp > Configuration > Webhook:
   - Callback URL: https://SEU-DOMINIO/api/whatsapp/webhook
   - Verify token: o mesmo de WHATSAPP_VERIFY_TOKEN
   - Assine o campo `messages`.
5. Para testar local, exponha com ngrok (ngrok http 3000) e use a URL do ngrok.

## 5. ATENÇÃO: rota pública
Se o seu projeto tem `middleware.ts` que exige login, libere
`/api/whatsapp/webhook`. A Meta não tem sessão; a segurança é a assinatura
HMAC (META_APP_SECRET) verificada na própria rota.

## 6. Usar
1. No app, abra a página WhatsApp (item novo na barra lateral) e clique em "Gerar código".
2. No WhatsApp, mande para o número do bot: VINCULAR 123456
3. Pronto: "gastei 45 no mercado", "recebi 1500 de freelance", ou um áudio.
   Responda com os botões Confirmar/Cancelar (ou "sim"/"não").

## Notas
- Custo: desde 01/10/2026 a Meta cobra por mensagem as respostas dentro da
  janela de 24h, com os primeiros 1.000 envios/mês por número gratuitos.
  Cada lançamento usa ~2 mensagens do bot (confirmação + "salvo"). Confira a
  tabela de preços atual da Meta para o Brasil.
- O texto/áudio é enviado à OpenAI (transcrição) e à Anthropic (interpretação).
  Vale citar isso na política de privacidade do app (LGPD).
- Lançamentos só são gravados depois de confirmados; pendentes expiram em 30 min.
