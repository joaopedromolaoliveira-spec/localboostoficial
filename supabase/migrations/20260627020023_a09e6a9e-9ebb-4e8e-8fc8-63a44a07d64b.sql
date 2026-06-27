
CREATE TABLE IF NOT EXISTS public.plan_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlight boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_catalog TO anon, authenticated;
GRANT ALL ON public.plan_catalog TO service_role;

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read_active"
  ON public.plan_catalog FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "plans_admin_insert"
  ON public.plan_catalog FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "plans_admin_update"
  ON public.plan_catalog FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "plans_admin_delete"
  ON public.plan_catalog FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER plan_catalog_set_updated_at
  BEFORE UPDATE ON public.plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plan_catalog (id, name, description, price_cents, features, highlight, sort_order) VALUES
  ('starter', 'Starter', 'Para começar a automatizar.', 9700,
    '["1 número WhatsApp","1.000 mensagens/mês","Automações básicas","CRM com até 500 contatos","Suporte por e-mail"]'::jsonb,
    false, 1),
  ('pro', 'Pro', 'Para crescer com IA.', 24700,
    '["5 números WhatsApp","Mensagens ilimitadas","Chatbot com IA","CRM ilimitado","Campanhas e segmentação","Suporte prioritário"]'::jsonb,
    true, 2),
  ('business', 'Business', 'Para empresas em escala.', 49700,
    '["WhatsApp ilimitado","Automações ilimitadas","Suíte completa de IA","Equipe multi-agente","Acesso à API","Gerente de sucesso dedicado"]'::jsonb,
    false, 3)
ON CONFLICT (id) DO NOTHING;
