
-- ============ RESTORE ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','manager','partner','user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('trial','starter','pro','business');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','canceled','incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.evolution_status AS ENUM ('disconnected','connecting','scan_qr','connected','failed','reconnecting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ RESTORE PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  business_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ RESTORE USER ROLES TABLE ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "user_roles_admin_select" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ RESTORE SUBSCRIPTIONS TABLE ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'trial',
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  amount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "subs_self_select" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "subs_admin_select" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ EVOLUTION API INSTANCES ============
CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  status public.evolution_status NOT NULL DEFAULT 'disconnected',
  qr_code text,
  phone_number text,
  profile_name text,
  profile_picture_url text,
  webhook_url text,
  webhook_secret text,
  api_key text,
  last_status_update timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, instance_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_instances TO authenticated;
GRANT ALL ON public.evolution_instances TO service_role;
ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "evolution_own" ON public.evolution_instances FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS evolution_owner_idx ON public.evolution_instances(owner_id);
CREATE TRIGGER IF NOT EXISTS evolution_updated BEFORE UPDATE ON public.evolution_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AI CONFIGURATION (EXPANDED) ============
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS objective text DEFAULT 'Responder dúvidas dos clientes de forma clara e prestativa.';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Olá! Como posso ajudá-lo?';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS out_of_hours_message text DEFAULT 'Estou fora do horário de atendimento. Deixe sua mensagem que responderei assim que possível.';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'openai';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gpt-4o-mini';
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS temperature numeric(3,2) DEFAULT 0.7;
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS max_tokens integer DEFAULT 1024;
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS enable_human_handoff boolean DEFAULT true;
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT false;

-- ============ FAQ TABLE ============
CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "faq_own" ON public.faq_items FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS faq_owner_idx ON public.faq_items(owner_id);
CREATE TRIGGER IF NOT EXISTS faq_updated BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ KNOWLEDGE BASE DOCUMENTS ============
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  file_type text,
  file_url text,
  document_type text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "kb_own" ON public.knowledge_documents FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS kb_owner_idx ON public.knowledge_documents(owner_id);
CREATE TRIGGER IF NOT EXISTS kb_updated BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ WORKING HOURS (IF NOT EXISTS) ============
CREATE TABLE IF NOT EXISTS public.working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.schedule_settings(id) ON DELETE CASCADE,
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
CREATE POLICY IF NOT EXISTS "hours_own" ON public.working_hours FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER IF NOT EXISTS hours_updated BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ RESTORE ROLE/PLAN ENFORCEMENT ============
CREATE OR REPLACE FUNCTION public.prevent_protected_role_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role IN ('admin','manager','partner') THEN
    RAISE EXCEPTION 'Papéis admin, gerente e parceiro não podem ser removidos';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_protected_role_delete ON public.user_roles;
CREATE TRIGGER trg_prevent_protected_role_delete
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_role_delete();

CREATE OR REPLACE FUNCTION public.enforce_role_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(NEW.user_id, 'admin') THEN
    NEW.plan := 'business';
    NEW.status := 'active';
  ELSIF public.has_role(NEW.user_id, 'manager') OR public.has_role(NEW.user_id, 'partner') THEN
    IF NEW.plan IN ('trial','starter') THEN
      NEW.plan := 'pro';
      NEW.status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_plan ON public.subscriptions;
CREATE TRIGGER trg_enforce_role_plan
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_plan();

-- ============ AUTO-GRANT ADMIN FOR KNOWN EMAILS ============
CREATE OR REPLACE FUNCTION public.grant_admin_for_known_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) IN ('joaopedromoladeoliveira@gmail.com','localboostwhatsapp@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_admin_for_known_emails() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_known_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_known_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_known_emails();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_known_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_known_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_known_emails();

-- ============ UPDATED HANDLE_NEW_USER FUNCTION ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, business_name, trial_ends_at)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'business_name',
    now() + INTERVAL '7 days')
  ON CONFLICT (id) DO NOTHING;

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert trial subscription
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (NEW.id, 'trial', 'trialing', now() + INTERVAL '7 days')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert schedule settings
  INSERT INTO public.schedule_settings (owner_id) VALUES (NEW.id)
  ON CONFLICT (owner_id) DO NOTHING
  RETURNING id INTO sid;
  IF sid IS NULL THEN
    SELECT id INTO sid FROM public.schedule_settings WHERE owner_id = NEW.id;
  END IF;

  -- Insert working hours
  INSERT INTO public.working_hours (owner_id, schedule_id, day_of_week, is_enabled, start_time, end_time)
  SELECT NEW.id, sid, d, d BETWEEN 1 AND 5, '09:00', '17:00'
  FROM generate_series(0,6) d
  ON CONFLICT DO NOTHING;

  -- Insert bot settings
  INSERT INTO public.bot_settings (owner_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BACKFILL EXISTING USERS ============
INSERT INTO public.profiles (id, email, full_name, business_name, trial_ends_at)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'business_name', now() + INTERVAL '7 days'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'user')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
SELECT u.id, 'trial'::plan_tier, 'trialing'::subscription_status, now() + INTERVAL '7 days'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- Grant admin to known emails
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email_confirmed_at IS NOT NULL
  AND lower(u.email) IN ('joaopedromoladeoliveira@gmail.com','localboostwhatsapp@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ REALTIME SUBSCRIPTIONS ============
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.evolution_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.bot_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.faq_items;
