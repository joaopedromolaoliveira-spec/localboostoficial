# Evolution API Integration Guide

Este documento descreve como configurar e usar a integração com Evolution API no LocalBoost.

## 📋 Visão Geral

O LocalBoost agora usa **Evolution API** como provedor oficial de WhatsApp, substituindo integrações anteriores. A integração oferece:

- ✅ Conexão real via QR Code
- ✅ Gerenciamento automático de instâncias
- ✅ Agente de IA com base de conhecimento
- ✅ Webhooks em tempo real
- ✅ Suporte a múltiplas sessões
- ✅ Sem dados fictícios ou simulações

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` baseado em `.env.example`:

```bash
# Evolution API
EVOLUTION_API_URL=https://api.evolution.local
EVOLUTION_API_KEY=sua-chave-de-api
EVOLUTION_INSTANCE_NAME=default

# Lovable AI (para LLM)
LOVABLE_API_KEY=sua-chave-lovable

# App URL (necessário para webhooks)
VITE_APP_URL=https://seu-dominio.com

# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 2. Migração Supabase

Execute a migração para criar as tabelas necessárias:

```bash
supabase migration up
```

Ou se estiver usando Supabase Cloud:

```bash
supabase db push
```

A migração cria:
- `evolution_instances` - Gerencia instâncias de WhatsApp
- `bot_settings` - Configuração expandida do assistente
- `faq_items` - Perguntas frequentes
- `knowledge_documents` - Base de conhecimento
- `user_roles` - Controle de acesso (admin, user, etc.)
- `subscriptions` - Gerenciamento de planos (trial, starter, pro, business)
- `profiles` - Perfis de usuário com trial de 7 dias

### 3. Configurar Webhook

Após criar uma instância, o webhook é automaticamente configurado para:

```
https://seu-dominio.com/api/public/webhooks/evolution?owner=USER_ID
```

O Evolution API enviará eventos para este endpoint.

## 🚀 Fluxo de Uso

### Conectar WhatsApp

1. Acesse **Configurações → Conectar WhatsApp**
2. Clique em **"Conectar WhatsApp"**
3. Uma instância será criada automaticamente
4. Um QR Code será exibido
5. Abra WhatsApp → Configurações → Aparelhos conectados
6. Clique em "Conectar um aparelho"
7. Escaneie o QR Code
8. Aguarde a conexão ser estabelecida

### Configurar Assistente de IA

1. Acesse **Configurações → Configuração da IA**
2. Preencha:
   - **Nome do Assistente**: Ex: "Assistente LocalBoost"
   - **Objetivo**: O que o assistente deve fazer
   - **Personalidade**: Tom de voz desejado
   - **Prompt do Sistema**: Instruções detalhadas
   - **Modelo de IA**: Escolha entre modelos disponíveis
   - **Temperatura**: Controla criatividade (0-1)
   - **Máximo de Tokens**: Limite de resposta

3. Adicione **Perguntas Frequentes (FAQ)**
4. Adicione **Documentos** à base de conhecimento
5. Ative o assistente

### Receber Mensagens

Quando um cliente enviar uma mensagem no WhatsApp:

1. O webhook recebe a mensagem
2. A IA analisa o contexto e base de conhecimento
3. Uma resposta é gerada automaticamente
4. A mensagem é enviada de volta ao cliente
5. Tudo é registrado no banco de dados

## 📊 Estrutura de Dados

### Tabela: evolution_instances

```sql
{
  id: uuid,
  owner_id: uuid,
  instance_name: text,
  status: enum ('disconnected', 'connecting', 'scan_qr', 'connected', 'failed', 'reconnecting'),
  qr_code: text,
  phone_number: text,
  profile_name: text,
  profile_picture_url: text,
  webhook_url: text,
  webhook_secret: text,
  api_key: text,
  last_status_update: timestamptz,
  created_at: timestamptz,
  updated_at: timestamptz
}
```

### Tabela: bot_settings (expandida)

```sql
{
  id: uuid,
  owner_id: uuid,
  name: text,
  objective: text,
  personality: text,
  system_prompt: text,
  language: text,
  welcome_message: text,
  out_of_hours_message: text,
  ai_provider: text,
  ai_model: text,
  temperature: numeric,
  max_tokens: integer,
  enable_human_handoff: boolean,
  enabled: boolean,
  created_at: timestamptz,
  updated_at: timestamptz
}
```

### Tabela: faq_items

```sql
{
  id: uuid,
  owner_id: uuid,
  question: text,
  answer: text,
  category: text,
  order_index: integer,
  created_at: timestamptz,
  updated_at: timestamptz
}
```

### Tabela: knowledge_documents

```sql
{
  id: uuid,
  owner_id: uuid,
  title: text,
  content: text,
  file_type: text,
  file_url: text,
  document_type: text,
  created_at: timestamptz,
  updated_at: timestamptz
}
```

## 🔐 Regras de Negócio

### Trial de 7 Dias

- Novos usuários recebem **trial automático** de 7 dias
- Após 7 dias, o plano expira e o usuário não pode enviar mensagens
- Admins podem estender o trial ou ativar um plano pago

### Planos

| Plano | Preço | Instâncias | Recursos |
|-------|-------|-----------|----------|
| Trial | Grátis | 1 | Limitado |
| Starter | R$ 27/mês | 1 | Básico |
| Pro | R$ 270/ano | 3 | Avançado |
| Business | Grátis* | Ilimitado | Completo |

*Apenas para administradores

### Administradores

Os seguintes e-mails são automaticamente promovidos a **admin**:

- `joaopedromoladeoliveira@gmail.com`
- `localboostwhatsapp@gmail.com`

Admins têm:
- Acesso total ao painel
- Plano Business (grátis)
- Gerenciamento de usuários
- Gerenciamento de planos

## 🔌 API Endpoints

### GET /api/evolution?action=instance

Obtém a instância Evolution do usuário autenticado.

**Resposta:**
```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "instance_name": "instance_user-id",
  "status": "connected",
  "phone_number": "5511999999999",
  "profile_name": "Nome do Perfil",
  "profile_picture_url": "https://..."
}
```

### POST /api/evolution?action=create-instance

Cria uma nova instância e gera QR Code.

**Resposta:**
```json
{
  "success": true,
  "instance": {...},
  "qrCode": {
    "code": "...",
    "base64": "data:image/png;base64,..."
  }
}
```

### POST /api/evolution?action=reconnect

Reconecta a instância e gera novo QR Code.

### POST /api/evolution?action=disconnect

Desconecta a instância do WhatsApp.

### POST /api/public/webhooks/evolution?owner=USER_ID

Webhook que recebe eventos do Evolution API.

**Eventos suportados:**
- `connection.update` - Mudança de status da conexão
- `messages.upsert` - Nova mensagem recebida

## 🤖 Fluxo de IA

Quando uma mensagem é recebida:

1. **Extração**: Telefone e texto são extraídos
2. **Contexto**: Histórico da conversa é carregado
3. **Base de Conhecimento**: FAQ e documentos são incluídos
4. **Geração**: LLM gera resposta baseada em contexto
5. **Envio**: Resposta é enviada via Evolution API
6. **Registro**: Tudo é salvo no banco de dados

### Exemplo de Prompt

```
Você é um assistente de atendimento ao cliente cordial e prestativo.

PERSONALIDADE: Profissional, empático, direto
IDIOMA: pt-BR
OBJETIVO: Ajudar clientes com dúvidas sobre produtos

PERGUNTAS FREQUENTES (FAQ):
Q: Qual é o horário de atendimento?
A: Atendemos de segunda a sexta, das 9h às 18h

BASE DE CONHECIMENTO:
[Política de Devoluções]
Aceitamos devoluções em até 30 dias...

INSTRUÇÕES:
- Responda sempre em português
- Se não souber, diga "Desculpe, não tenho essa informação"
- Não invente dados
- Seja empático e profissional
```

## 🐛 Troubleshooting

### "EVOLUTION_API_KEY not configured"

Verifique se a variável de ambiente está definida:
```bash
echo $EVOLUTION_API_KEY
```

### QR Code não aparece

1. Verifique se a instância foi criada no Evolution API
2. Confirme que `EVOLUTION_API_URL` está correto
3. Verifique os logs do servidor

### Mensagens não chegam

1. Confirme que o webhook está configurado
2. Verifique se `VITE_APP_URL` está correto
3. Confirme que o WhatsApp está conectado (status = "connected")
4. Verifique os logs do webhook

### IA não responde

1. Verifique se `LOVABLE_API_KEY` está configurado
2. Confirme que o assistente está ativado em Configurações
3. Verifique se há base de conhecimento configurada
4. Consulte os logs do servidor

## 📝 Próximos Passos

- [ ] Configurar Evolution API
- [ ] Definir variáveis de ambiente
- [ ] Executar migração Supabase
- [ ] Conectar WhatsApp
- [ ] Configurar assistente de IA
- [ ] Adicionar FAQ
- [ ] Adicionar base de conhecimento
- [ ] Testar fluxo de mensagens
- [ ] Configurar planos e pagamentos

## 📚 Referências

- [Evolution API Docs](https://evolution-api.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Lovable AI Gateway](https://lovable.dev)

## 💬 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
