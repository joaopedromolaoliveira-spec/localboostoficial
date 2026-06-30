
-- ===== ENUMS =====
CREATE TYPE public.contact_stage AS ENUM ('lead','qualified','customer','lost');
CREATE TYPE public.conversation_status AS ENUM ('open','pending','resolved','snoozed');
CREATE TYPE public.message_direction AS ENUM ('inbound','outbound');
CREATE TYPE public.message_status AS ENUM ('queued','sent','delivered','read','failed');
CREATE TYPE public.message_kind AS ENUM ('text','image','audio','video','document','location','template','system');
CREATE TYPE public.waha_status AS ENUM ('disconnected','connecting','scan_qr','working','failed');
CREATE TYPE public.automation_trigger AS ENUM ('keyword','first_message','tag_added','schedule','webhook');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','sending','done','canceled','failed');
CREATE TYPE public.ai_provider AS ENUM ('lovable','openai','gemini');

-- ===== CONTACTS =====
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  email text,
  avatar_url text,
  stage public.contact_stage NOT NULL DEFAULT 'lead',
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_own ON public.contacts FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX contacts_owner_idx ON public.contacts(owner_id);
CREATE INDEX contacts_stage_idx ON public.contacts(owner_id, stage);
CREATE TRIGGER set_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== WHATSAPP SESSIONS (WAHA) =====
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  status public.waha_status NOT NULL DEFAULT 'disconnected',
  qr_code text,
  phone_number text,
  webhook_secret text,
  last_status_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessions TO authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY waha_own ON public.whatsapp_sessions FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER set_waha_updated BEFORE UPDATE ON public.whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CONVERSATIONS =====
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  status public.conversation_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_own ON public.conversations FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX conv_owner_status_idx ON public.conversations(owner_id, status, last_message_at DESC);
CREATE TRIGGER set_conv_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== MESSAGES =====
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction public.message_direction NOT NULL,
  kind public.message_kind NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  status public.message_status NOT NULL DEFAULT 'queued',
  waha_id text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY msg_own ON public.messages FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX msg_conv_idx ON public.messages(conversation_id, created_at);

-- ===== TEAM MEMBERS =====
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'agent',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(owner_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_owner ON public.team_members FOR ALL TO authenticated USING (auth.uid() = owner_id OR auth.uid() = member_user_id) WITH CHECK (auth.uid() = owner_id);

-- ===== AUTOMATIONS =====
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  trigger_type public.automation_trigger NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  runs_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY auto_own ON public.automations FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER set_auto_updated BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CAMPAIGNS =====
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  message text NOT NULL,
  media_url text,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  target_tags text[] NOT NULL DEFAULT '{}',
  target_stage public.contact_stage,
  scheduled_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY camp_own ON public.campaigns FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER set_camp_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AI ASSISTANT =====
CREATE TABLE public.ai_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Assistente',
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text NOT NULL DEFAULT 'Você é um atendente cordial e prestativo de uma empresa. Responda em português, de forma curta e clara.',
  knowledge text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistants TO authenticated;
GRANT ALL ON public.ai_assistants TO service_role;
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_own ON public.ai_assistants FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER set_ai_updated BEFORE UPDATE ON public.ai_assistants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AFFILIATES =====
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  commission_pct numeric(5,2) NOT NULL DEFAULT 30.00,
  earnings_cents integer NOT NULL DEFAULT 0,
  paid_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY aff_self ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY aff_self_upd ON public.affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY aff_self_ins ON public.affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== WAHA INSTANCE CONFIG (per project) =====
CREATE TABLE public.waha_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  base_url text,
  api_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waha_config TO authenticated;
GRANT ALL ON public.waha_config TO service_role;
ALTER TABLE public.waha_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY waha_cfg_own ON public.waha_config FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER set_waha_cfg_updated BEFORE UPDATE ON public.waha_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
