
# WhatsApp AI Appointment Scheduler (WhatsAble)

Substituir o app atual por um agendador com agente de IA via WhatsAble. Manter Auth (email/senha + Google), design system e layout de sidebar.

## O que sai

- Rotas: `whatsapp`, `conversations`, `automations`, `campaigns`, `ai-assistant`, `reports`, `billing`, `admin`
- Server routes WAHA: `api/public/waha/*`, `api/public/webhooks/waha`, `api/public/campaigns/*`, `api/public/ai/test`
- Libs: `waha.server.ts`, `ai-gateway.server.ts` (recriado limpo), `services/waha.ts`, `contexts/WhatsAppContext.tsx`, `components/whatsapp/*`
- Tabelas antigas: drop `whatsapp_sessions`, `waha_config`, `waha_error_log`, `automations`, `campaigns`, `ai_assistants`, `affiliates`, `team_members`, `plan_catalog`, `subscriptions`, `user_roles`
- Landing/pricing complexos → landing simples

## O que fica

- Auth (`/auth`, forgot/reset), `_authenticated` layout, sidebar, tema/design tokens
- `profiles` (perfil do dono)

## Novas tabelas (Cloud)

`contacts`, `conversations`, `appointments` (+enum `appointment_status`), `message_logs`, `schedule_settings`, `working_hours`, `bot_settings` — todas escopadas ao dono (`owner_id = auth.uid()`), com RLS + GRANTs.

Seed: 1 `schedule_settings` + 1 `bot_settings` + 7 `working_hours` criados por trigger `handle_new_user` para cada novo usuário.

## Backend

- `POST /api/public/webhooks/whatsable` — webhook público (sem auth, valida por `owner_id` derivado do número do WhatsApp Business ou por query param `?owner=<uuid>` no URL configurado no WhatsAble; fallback: primeiro usuário). Faz upsert de contato, calcula `session_open` (24h), grava inbound em `message_logs`, chama `aiRouter`, executa ação (CREATE/CONFIRM/CANCEL/RESCHEDULE), atualiza contato, envia resposta via WhatsAble, grava outbound.
- `src/lib/ai-router.server.ts` — helper server-side: carrega `bot_settings`, `schedule_settings`, `working_hours`, appointments futuros; calcula slots livres (14 dias, 3/dia, respeita duração+buffer+working hours); monta system prompt com `currentDateTime`, contato, agenda, últimas 15 mensagens; chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com `Output.object` para retornar `{reply, action, contactUpdate}`.
- `src/lib/whatsable.server.ts` — cliente HTTP: `sendText(to, body)` → `POST {WHATSABLE_BASE_URL}/api:U9ztporN/send/message`.
- Server functions autenticadas para o dashboard (list/update de contatos, appointments, settings).

Secrets: `WHATSABLE_API_KEY` (add via secrets tool), `WHATSABLE_BASE_URL` (default `https://xnjq-frjc-cn6a.n7d.xano.io` — pedir confirmação), `LOVABLE_API_KEY` (já existe).

## Frontend

- `/` landing curta explicando o agente + CTA para /auth
- `/dashboard` — stats (total contatos, appts próximos, pendentes)
- `/appointments` — lista com badges de status, hora em Europe/Madrid via `date-fns-tz`
- `/contacts` — lista com última interação, budget, notes
- `/bot-settings` — nome, personalidade, `system_prompt`
- `/schedule-settings` — duração, buffer, timezone, working hours por dia
- `/webhook` — mostra a URL do webhook para o usuário colar no WhatsAble

Sidebar reduzida: Dashboard, Agendamentos, Contatos, Bot, Agenda, Webhook, Configurações.

## Ordem de execução

1. Migration: drop tabelas antigas + criar novas + trigger seed + RLS/GRANTs
2. Pedir secret `WHATSABLE_API_KEY`
3. Remover arquivos antigos (rm)
4. Criar `whatsable.server.ts`, `ai-router.server.ts`, webhook route, server functions
5. Reescrever sidebar, dashboard e páginas novas
6. Landing simples
7. Verificar build

## Detalhes técnicos

- IA: AI SDK + `createLovableAiGatewayProvider` (helper já existe em `ai-gateway.server.ts`, reaproveitar), modelo `google/gemini-3-flash-preview`, `Output.object` com schema plano (reply string, action com type enum, contactUpdate opcional).
- Timezone: default `Europe/Madrid` (spec mistura Berlin e Madrid; usar Madrid como display, Berlin como default de config editável).
- Multi-tenant: webhook precisa saber a quem pertence a mensagem. Estratégia: URL do webhook inclui `?owner=<user_id>` que cada usuário copia em `/webhook`. Sem `owner_id` válido → 400.
- Handlers estritamente inside handler bodies; `supabaseAdmin` importado dinamicamente.
