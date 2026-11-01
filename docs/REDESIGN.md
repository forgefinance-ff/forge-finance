# Forge Finance — Redesign roxo (17/10/2026)

## O que mudou
- `app/globals.css`: tokens de cor centralizados (roxo/violeta/índigo + grafite). Agora também define os tokens do shadcn (`--color-muted`, `--color-sidebar*` etc.) que antes não existiam.
- `components/app-sidebar.tsx`: barra lateral de 80 px só com ícones, tooltip acessível (hover/foco), item ativo derivado da rota (`usePathname`) com brilho roxo; `MobileNav` (barra inferior) no celular.
- `components/site-header.tsx`: topbar compacta (marca, status real da IA, "ir para página", configurações, perfil).
- `app/(dashboard)/layout.tsx`: novo shell (sem `SidebarProvider`); autenticação preservada.
- Dashboard: `dashboard-overview`, `dashboard-cards`, `dashboard-chart` (barras), `forge-intelligence`, `assistant-box`, `activity-heatmap`, `expense-breakdown`, `wealth-distribution`.
- `lib/dashboard-analytics.ts` + extensão de `lib/dashboard.ts`: análises calculadas das transações reais.
- `app/api/ai/assistant/route.ts`: endpoint de IA somente-consulta, no servidor.
- Retema nas demais páginas por substituição de cores (azul/ciano → roxo/índigo, `#111827` → `#18181b`).
- Originais das peças substituídas: `docs/originais-pre-redesign/*.txt`.

## Variáveis de ambiente
Ver `.env.example`. Sem `ANTHROPIC_API_KEY` a IA fica desativada (nada é simulado).

## Não implementado (de propósito)
Escrita via IA (registrar transações por chat), WhatsApp, Open Finance, lembretes/resumos automáticos, mapa geográfico (não há dados de localização no esquema), bell de notificações (não há sistema de notificações).
