
-- ============ DROP OLD ============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.grant_admin_for_known_emails() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_role_plan() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_protected_role_delete() CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, plan_tier, subscription_status, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS public.affiliates_block_financial_updates() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

DROP TABLE IF EXISTS public.whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS public.waha_config CASCADE;
DROP TABLE IF EXISTS public.waha_error_log CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.automations CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.ai_assistants CASCADE;
DROP TABLE IF EXISTS public.affiliates CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.plan_catalog CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.plan_tier CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CONTACTS ============
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  name text,
  email text,
  locale text DEFAULT 'pt-BR',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget numeric,
  notes text,
  is_subscribed boolean NOT NULL DEFAULT true,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, phone_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.contacts FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CONVERSATIONS ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL UNIQUE REFERENCES public.contacts(id) ON DELETE CASCADE,
  last_user_message_at timestamptz,
  last_bot_message_at timestamptz,
  last_user_message_text text,
  last_bot_message_text text,
  session_open boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.conversations FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ APPOINTMENTS ============
CREATE TYPE public.appointment_status AS ENUM
  ('PENDING_CONFIRMATION','CONFIRMED','CANCELLED','RESCHEDULE_REQUESTED');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status public.appointment_status NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  subject text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appointments" ON public.appointments FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX appointments_owner_start_idx ON public.appointments(owner_id, start_time);

-- ============ MESSAGE LOGS ============
CREATE TABLE public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text NOT NULL DEFAULT 'text',
  content text,
  template_name text,
  whatsable_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_logs TO authenticated;
GRANT ALL ON public.message_logs TO service_role;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.message_logs FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX message_logs_contact_created_idx ON public.message_logs(contact_id, created_at DESC);

-- ============ SCHEDULE SETTINGS ============
CREATE TABLE public.schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_duration_minutes int NOT NULL DEFAULT 60,
  buffer_minutes int NOT NULL DEFAULT 15,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_settings TO authenticated;
GRANT ALL ON public.schedule_settings TO service_role;
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedule" ON public.schedule_settings FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER schedule_updated BEFORE UPDATE ON public.schedule_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ WORKING HOURS ============
CREATE TABLE public.working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.schedule_settings(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_enabled boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_hours TO authenticated;
GRANT ALL ON public.working_hours TO service_role;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hours" ON public.working_hours FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER hours_updated BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BOT SETTINGS ============
CREATE TABLE public.bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Assistente',
  personality text NOT NULL DEFAULT 'Cordial, direto e prestativo. Responde em português.',
  system_prompt text NOT NULL DEFAULT 'Você é um assistente de agendamento. Ajude o cliente a marcar, confirmar, cancelar ou reagendar horários de forma clara e educada.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_settings TO authenticated;
GRANT ALL ON public.bot_settings TO service_role;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bot" ON public.bot_settings FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER bot_updated BEFORE UPDATE ON public.bot_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILE + SEED ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'business_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.schedule_settings (owner_id) VALUES (NEW.id)
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING id INTO sid;
  IF sid IS NULL THEN
    SELECT id INTO sid FROM public.schedule_settings WHERE owner_id = NEW.id;
  END IF;

  INSERT INTO public.working_hours (owner_id, schedule_id, day_of_week, is_enabled, start_time, end_time)
  SELECT NEW.id, sid, d, d BETWEEN 1 AND 5, '09:00', '17:00'
  FROM generate_series(0,6) d
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bot_settings (owner_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill for existing users
INSERT INTO public.schedule_settings (owner_id)
SELECT id FROM auth.users ON CONFLICT (owner_id) DO NOTHING;

INSERT INTO public.working_hours (owner_id, schedule_id, day_of_week, is_enabled, start_time, end_time)
SELECT s.owner_id, s.id, d, d BETWEEN 1 AND 5, '09:00', '17:00'
FROM public.schedule_settings s CROSS JOIN generate_series(0,6) d
ON CONFLICT DO NOTHING;

INSERT INTO public.bot_settings (owner_id)
SELECT id FROM auth.users ON CONFLICT (owner_id) DO NOTHING;
